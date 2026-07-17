# G10 – Reportería / Batch / Streaming
## FishMarket Cloud — API

Servicio del dominio **Reportería** del grupo G10. Expone endpoints REST de reportes consolidados, recalculación batch e inventario, además de un canal **WebSocket** para streaming de eventos en tiempo real.

> **Rol de G10:** consumidor de solo lectura. G10 no genera transacciones ni modifica datos transaccionales de otros grupos. Lee desde G5 (Órdenes) y G6 (Pagos) vía Supabase Realtime y expone dashboards agregados.

> **E3 — Persistencia real:** el servicio ahora lee y escribe en PostgreSQL (Supabase) cuando `DATABASE_URL` está configurada. Si no lo está (ej. desarrollo local sin DB), hace fallback automático a datos mock en memoria — mismo comportamiento que en E2. Cada respuesta incluye `source: "db"` o `source: "mock"` para que sea explícito de dónde vienen los datos.

---

## Endpoints REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/health` | Estado del servicio y clientes WS conectados |
| `GET`  | `/api/v1/reports/sales-summary` | Resumen de ventas por período |
| `GET`  | `/api/v1/reports/products` | Breakdown por producto |
| `GET`  | `/api/v1/reports/status` | Conteo de órdenes por estado |
| `GET`  | `/api/v1/reports/fulfillment` | Métricas de fulfillment |
| `GET`  | `/api/v1/reports/communications` | Estadísticas de comunicaciones |
| `GET`  | `/api/v1/reports/order-trends` | Tendencias de pedidos |
| `GET`  | `/api/v1/reports/payment-summary` | Resumen de pagos |
| `GET`  | `/api/v1/inventory/low-stock` | Productos con stock bajo |
| `POST` | `/api/v1/batch/recalculate` | Disparar recalculación batch |

---

## WebSocket

**Ruta:** `wss://fishmarket-45lw.onrender.com/ws`  
**Demo visual:** `https://fishmarket-45lw.onrender.com/ws-demo.html`

El servidor emite eventos en tiempo real a todos los clientes conectados. El principal disparador es el endpoint `POST /batch/recalculate`, que al ejecutarse transmite el ciclo de vida completo del job.

### Eventos emitidos por el servidor

| Tipo | Cuándo se emite |
|------|----------------|
| `connected` | Al establecer la conexión |
| `batch:queued` | Inmediatamente al encolar el job |
| `batch:running` | 3 veces durante la ejecución (25%, 60%, 90%) |
| `batch:completed` | Al finalizar el job. Incluye `persisted: true/false` según si escribió en la DB real o fue simulado |
| `batch:failed` *(E3)* | Si la persistencia real falla (ej. DB caída a mitad de la recalculación) |
| `report:updated` | Cuando las tablas de reporte son actualizadas |
| `inventory:alert` | Cada 60s si hay productos con stock crítico |

### Mensajes que puede enviar el cliente

```json
{ "type": "ping" }
{ "type": "subscribe", "channel": "inventory-alerts" }
```

### Ejemplo de conexión

```javascript
const ws = new WebSocket('wss://fishmarket-45lw.onrender.com/ws');

ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(event.type, event.message);
};
```

### Ejemplo de evento `batch:running`

```json
{
  "type": "batch:running",
  "jobId": "batch_20250115_410309",
  "progress": 60,
  "message": "Consolidando métricas de pagos (G6)...",
  "timestamp": "2025-01-15T14:32:05.000Z"
}
```

---

## Query params comunes (REST)

| Param | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `startDate` | `YYYY-MM-DD` | Inicio del período | `2025-01-01` |
| `endDate` | `YYYY-MM-DD` | Fin del período | `2025-01-31` |
| `groupBy` | `day\|week\|month` | Agrupación temporal | `week` |

### Parámetros específicos

- `GET /reports/products` → `limit` (número, default 10)
- `GET /reports/order-trends` → `interval` (day\|week\|month)
- `GET /inventory/low-stock` → `threshold` (número, default 10)
- `POST /batch/recalculate` → body `{ targetDate, scope: daily|weekly|monthly }`

---

## Ejemplos de uso (REST)

```bash
# Resumen de ventas enero 2025
curl "https://fishmarket-45lw.onrender.com/api/v1/reports/sales-summary?startDate=2025-01-01&endDate=2025-01-31&groupBy=week"

# Productos con stock crítico (< 5 unidades)
curl "https://fishmarket-45lw.onrender.com/api/v1/inventory/low-stock?threshold=5"

# Disparar recalculación batch (también emite eventos WebSocket)
curl -X POST "https://fishmarket-45lw.onrender.com/api/v1/batch/recalculate" \
  -H "Content-Type: application/json" \
  -d '{ "targetDate": "2025-01-15", "scope": "daily" }'
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PORT` | No (default 3000) | Puerto HTTP local |
| `NODE_ENV` | No | `development` \| `production` |
| `DATABASE_URL` | No* | Connection string de Supabase Postgres (Session Pooler). Si falta, el servicio usa datos mock automáticamente. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | No | Reservadas para uso futuro del cliente JS de Supabase (Realtime/Auth) |

\* No es obligatoria para que el servicio levante, pero **sí lo es** para cumplir el requisito de persistencia real de E3 en el deploy de producción.

Ver plantilla completa en [`.env.example`](./.env.example). Nunca commitear `.env`.

---

## Setup local

```bash
git clone <url-del-repo>
cd g10-reporteria-mock

npm install

cp .env.example .env

npm run dev   # Desarrollo con hot-reload
# o
npm start     # Producción
```

- REST disponible en `http://localhost:3000`
- WebSocket disponible en `ws://localhost:3000/ws`
- Demo WebSocket en `http://localhost:3000/ws-demo.html`

---

## Despliegue en Render

1. Subir el repositorio a GitHub.
2. Crear un nuevo **Web Service** en [render.com](https://render.com) → runtime **Node**.
3. Apuntar al repositorio, seleccionar rama `main`.
4. Build: `npm install` | Start: `npm start`.
5. En **Environment**, agregar la variable secreta `DATABASE_URL` con el connection string de Supabase (Session Pooler, puerto `6543`). Sin esto el servicio sigue funcionando, pero solo con datos mock.
6. (Una sola vez) Poblar la base con histórico de demo desde tu máquina local:
   ```bash
   DATABASE_URL="postgresql://..." npm run seed
   # o con un rango/cantidad de días distinto:
   DATABASE_URL="postgresql://..." node scripts/seed.js --days=45 --end=2025-01-31
   ```

> **Nota free tier:** el servidor se duerme tras 15 min de inactividad. Hacer una request a `/health` antes de cualquier demo para despertarlo — la respuesta incluye `persistence.connected` para confirmar que la DB está viva.

---

## CI/CD

Pipeline en `.github/workflows/ci.yml`, con dos jobs:

1. **`test`** (en cada push/PR a `main`): instala dependencias, valida sintaxis de todos los módulos, levanta el servidor en modo mock (sin `DATABASE_URL`, para no depender de Supabase en CI) y corre la colección completa de Postman con Newman.
2. **`deploy`** (solo en push a `main`, si `test` pasó): dispara el *Deploy Hook* de Render vía `curl` usando el secret `RENDER_DEPLOY_HOOK_URL`.

Para activar el deploy automático desde Actions (opcional — Render igual redespliega solo al detectar el push, vía su integración nativa con GitHub):

1. En Render → tu servicio → **Settings → Deploy Hook** → copiar la URL.
2. En GitHub → **Settings → Secrets and variables → Actions** → crear `RENDER_DEPLOY_HOOK_URL` con ese valor.

Si el secret no está configurado, el job `deploy` no falla: simplemente omite el `curl` y deja que el auto-deploy nativo de Render haga el trabajo.

---

## Modelo de datos

Las tablas Supabase se encuentran en `database/schema.sql`.

| Tabla | Descripción |
|-------|-------------|
| `report_sales_daily` | Ventas diarias consolidadas |
| `report_product_metrics` | Métricas por producto |
| `report_order_status` | Conteo de órdenes por estado |
| `report_inventory_snapshots` | Snapshots de inventario |
| `report_fulfillment_metrics` | KPIs de fulfillment |
| `report_payment_summaries` | Resumen de pagos por método |
| `batch_jobs` | Tracking de jobs de recalculación |
| `streaming_events_log` | Log de eventos Supabase Realtime consumidos |
| `report_communications_summary` *(E3)* | Estadísticas de comunicaciones por tipo |
| `report_fulfillment_by_region` *(E3)* | Desglose de fulfillment por región |
| `report_fulfillment_by_carrier` *(E3)* | Desglose de fulfillment por transportista |

Todas las escrituras son `INSERT ... ON CONFLICT (fecha, ...) DO UPDATE` (upsert), por lo que recalcular un mismo día es idempotente — no genera filas duplicadas.

---

## Manejo de errores

Todas las respuestas de error (validación, 404, fallas internas) siguen el mismo formato:

```json
{
  "error": "Bad Request",
  "message": "groupBy debe ser uno de: day, week, month",
  "code": "BAD_REQUEST",
  "timestamp": "2025-01-15T14:32:05.000Z"
}
```

| Código HTTP | Cuándo |
|---|---|
| `400` | Parámetros de query/body inválidos (ver validaciones por endpoint) |
| `404` | Ruta inexistente |
| `500` | Error interno (ej. falla de conexión a la DB) — el `message` se mantiene genérico para no filtrar detalles internos; el detalle real queda solo en los logs del servidor |

Los errores 500 reales (no simulados) ocurren típicamente si `DATABASE_URL` está mal formada o Supabase no responde — en ese caso **no** se hace fallback silencioso a mock, porque eso ocultaría un problema real de infraestructura en producción. El fallback a mock solo aplica cuando `DATABASE_URL` directamente no está configurada.

---

## Estructura del proyecto

```
g10-reporteria-mock/
├── src/
│   ├── app.js                       # Entry point HTTP + WebSocket
│   ├── routes/
│   │   ├── reports.js               # GET endpoints de reportes (DB con fallback a mock)
│   │   ├── inventory.js             # GET /inventory/low-stock
│   │   └── batch.js                 # POST /batch/recalculate + WS events + persistencia
│   ├── websocket/
│   │   ├── wsServer.js              # Servidor WebSocket (/ws)
│   │   └── broadcaster.js           # Gestión de clientes y broadcast
│   ├── db/
│   │   └── pool.js                  # Pool de conexión a Postgres/Supabase (E3)
│   ├── repositories/                # (E3) Capa de acceso a datos real
│   │   ├── reportsRepository.js     # Queries de lectura para cada endpoint GET
│   │   ├── writeRepository.js       # Upserts de un día completo de métricas
│   │   └── batchRepository.js       # Ciclo de vida del batch job (running → completed/failed)
│   ├── utils/
│   │   ├── errors.js                # AppError + asyncHandler (manejo de errores estándar)
│   │   ├── dataSource.js            # Selector DB real vs mock fallback
│   │   └── dataGenerator.js         # Generador de datos sintéticos consistentes (E3)
│   └── data/
│       └── mockData.js              # Datos y lógica mock (fallback, igual que en E2)
├── scripts/
│   └── seed.js                      # (E3) Pobla la DB con N días de histórico
├── public/
│   └── ws-demo.html                 # Cliente de demo WebSocket
├── database/
│   └── schema.sql                   # Modelo de datos Supabase (E2 + tablas nuevas E3)
├── postman/
│   └── G10-Reporteria.postman_collection.json
├── .github/
│   └── workflows/
│       └── ci.yml                   # (E3) Pipeline CI/CD: tests + deploy a Render
├── .env.example
├── package.json
├── render.yaml
└── README.md
```

---

## Pruebas de contrato

Colección Postman con **33 tests** cubriendo todos los endpoints REST (happy path + validaciones de error).

Importar: `postman/G10-Reporteria.postman_collection.json`  
Configurar variable `baseUrl`: `https://fishmarket-45lw.onrender.com`

---

## QA — rama `feature/dashboard-mejora`

Alcance: rediseño visual del dashboard (responsive, tema claro/oscuro, jerarquía de KPIs), integración real con el catálogo de G3, y mejoras de expresión de métricas (cantidades reales junto a los porcentajes en Pedidos por estado, Pagos y Comunicaciones).

### 1. Dashboard — responsive y rediseño visual

- `.grid--charts-2`/`.grid--charts-3` desbordaban horizontalmente en celulares (~375-430px, el ancho mínimo de columna era mayor que el viewport disponible) — corregido con breakpoint a 640px.
- Header sin `flex-wrap` podía apretar el email + botón contra el título en pantallas angostas — corregido.
- Verificado con cada cambio de CSS: llaves balanceadas (conteo de `{`/`}` por script, sin depender de un linter) y `hmr update` sin overlay de error en la terminal de Vite tras cada guardado.
- Verificado en caliente contra el backend real corriendo en local: requests `200`/`304` en todos los endpoints de reportes después de cada tanda de cambios (sin errores nuevos en consola del servidor).

### 2. Integración G3 (Catálogo)

- Contrato descubierto y confirmado **en vivo con `curl`** contra `https://catalog-api-cm1l.onrender.com/api/v1` (no se asumió nada de documentación):
  - Probados `/health`, `/`, `/api/v1`, endpoints de docs/OpenAPI comunes (todos 404, G3 no expone spec) y nombres de recurso candidatos (`/products`, `/catalog`, `/items`, `/categories`) hasta encontrar los reales.
  - Confirmado que `/products` y `/categories` exigen los 3 headers (`X-Request-Id`, `X-Correlation-Id`, `X-Consumer`) devolviendo `400 MISSING_HEADERS` sin ellos — mismo patrón que G7.
  - Confirmado el parámetro de paginación real (`size`, no `pageSize` — este último se ignora silenciosamente).
  - Confirmado cruzando datos reales de ambos servicios que `G7.productId === G3.id` (la clave de join de todo el enriquecimiento).
- `node -c src/app.js` (`pnpm run test:syntax`) sin errores.
- Carga directa (`require`) de todos los módulos backend nuevos/tocados (`g3CatalogClient.js`, `liveIntegrationsSync.js`, `g7InventoryClient.js`, `writeRepository.js`, `reports.js`, `batch.js`, `inventory.js`) sin errores de sintaxis/referencia.
- Merge G7↔G3 probado end-to-end contra ambos servicios reales (no mock): 25 productos en inventario de G7, **22 enriquecidos correctamente** con nombre/categoría real de G3 (los 3 restantes son productos de prueba en G7 con UUIDs de ejemplo, ej. `550e8400-...`, nunca registrados en el catálogo real de G3 — el fallback productId/`category: null` funciona como corresponde, no es un bug).
- Verificación hecha **sin escribir en la base de datos compartida** (se probó hasta el punto justo antes de `upsertInventorySnapshots`), para no ensuciar datos reales de reportería durante la prueba.
- **Reconciliado con `main`:** en paralelo, otro integrante ya había mergeado su propia integración de G3 a `main` (commit `G3 Incorporation`). Al comparar ambas implementaciones, la de `main` era más completa — corrige un bug real en `writeRepository.js` (el `ON CONFLICT` de `upsertInventorySnapshots` no actualizaba `product_name`/`category` en filas ya existentes, solo `current_stock`) y agrega logging del ratio de match G7↔G3 en cada ciclo. Se adoptó la versión de `main` para `g3CatalogClient.js`, `liveIntegrationsSync.js`, `writeRepository.js` y `render.yaml` — confirmado con `git diff origin/main` que quedaron byte-idénticos, sin conflicto pendiente al mergear.

### 3. Expresión de métricas (Pedidos por estado, Pagos, Comunicaciones)

- Se detectó que `StatusBreakdownPanel`, `PaymentsPanel` y `CommunicationsPanel` mostraban solo porcentajes sin la cantidad real detrás, aunque el dato (`count`) ya venía en la respuesta de la API.
- Corregido en los 3 paneles; `GroupedBars.jsx` (componente de gráfico compartido) recibió un prop opcional nuevo (`getRowNote`) para soportarlo, sin afectar a otros usos del componente.
- Verificado sirviendo los archivos actualizados desde el dev server (`curl` al módulo transformado por Vite) y confirmando que el código nuevo (`getRowNote`, `count: m.count`) está presente en lo que realmente se sirve al navegador — no solo en el archivo fuente.

### 4. Fix de entorno (`dotenv`)

Gap preexistente (no introducido por esta rama, descubierto durante el QA): `src/app.js` nunca cargaba `.env` — faltaba `require("dotenv").config()`, así que cualquier `.env` local se ignoraba siempre en silencio.

- Agregado como primera línea de `app.js` (antes de cualquier otro `require`, para que las variables existan cuando el resto de los módulos las lean).
- `dotenv` movido de `devDependencies` a `dependencies` en `package.json` — con `npm install` plano y `NODE_ENV=production` en el build de Render, `devDependencies` se omite; sin este cambio, activar dotenv habría **roto el arranque en producción**. Relockeado con `pnpm install` (`pnpm-lock.yaml` actualizado).
- Verificado con una carga aislada de `dotenv.config()` (sin arrancar el servidor completo, para no disparar los syncs contra la DB/broker reales durante la prueba) que `DATABASE_URL`, `RABBITMQ_URL` y `G3_CATALOG_SERVICE_URL` quedan pobladas correctamente en `process.env`.
- **Sin efecto en producción** (Render ya inyecta las env vars directamente, `dotenv.config()` no encuentra `.env` ahí y no hace nada). **Sí activa la carga real de `.env` en desarrollo local** — a partir de este fix, correr el backend local con `.env` configurado escribe de verdad en la Supabase y el RabbitMQ compartidos (antes del fix, `.env` se ignoraba y todo era mock).

### 5. Seguridad — auditoría de credenciales

Repetida en 4 momentos distintos (antes de crear `.env`, después de la integración de G3, después del fix de `dotenv`, y otra vez tras reconciliar con `main`):
- `.env` confirmado ignorado por git (`git check-ignore -v`) y ausente de `git status`/`git status --ignored` en cada pasada.
- Búsqueda de los fragmentos exactos de cada credencial real (password de `DATABASE_URL`, usuario y password de `RABBITMQ_URL`, host de Supabase) en **todo el repositorio** (no solo archivos tocados, no solo tracked) — en todas las pasadas, aparecen únicamente en `./.env`.
- Revisión línea por línea del diff completo de cada archivo que sí se commitea (`.env.example`, `package.json`, `pnpm-lock.yaml`, `README.md`, `src/app.js`, y todos los `.jsx`/`.js` tocados) — cero credenciales.

**Estado:** lista para mergear a `main`.

---

## Dependencias externas (contratos E1)

| Grupo | Dominio | Tipo | Criticidad |
|-------|---------|------|-----------|
| G5 | Órdenes | Supabase Realtime consumer | 🔴 Crítica |
| G6 | Pagos | Supabase Realtime consumer | 🔴 Crítica |
| G3 | Catálogo | REST consumer | 🟠 Alta |
| G8 | Shipment | REST consumer | 🟡 Media |

---

**G10 — FishMarket Cloud** · Dominio: Reportería / Batch / Streaming
