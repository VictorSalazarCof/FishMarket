# G10 – Reportería / Batch / Streaming
## FishMarket Cloud — Mock API

Servicio mock del dominio **Reportería** del grupo G10. Expone endpoints REST de reportes consolidados, recalculación batch e inventario, además de un canal **WebSocket** para streaming de eventos en tiempo real.

> **Rol de G10:** consumidor de solo lectura. G10 no genera transacciones ni modifica datos. Lee desde G5 (Órdenes) y G6 (Pagos) vía Supabase Realtime y expone dashboards agregados.

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
| `batch:completed` | Al finalizar el job |
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

> **Nota free tier:** el servidor se duerme tras 15 min de inactividad. Hacer una request a `/health` antes de cualquier demo para despertarlo.

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

---

## Estructura del proyecto

```
g10-reporteria-mock/
├── src/
│   ├── app.js                  # Entry point HTTP + WebSocket
│   ├── routes/
│   │   ├── reports.js          # GET endpoints de reportes
│   │   ├── inventory.js        # GET /inventory/low-stock
│   │   └── batch.js            # POST /batch/recalculate + WS events
│   ├── websocket/
│   │   ├── wsServer.js         # Servidor WebSocket (/ws)
│   │   └── broadcaster.js      # Gestión de clientes y broadcast
│   └── data/
│       └── mockData.js         # Datos y lógica mock
├── public/
│   └── ws-demo.html            # Cliente de demo WebSocket
├── database/
│   └── schema.sql              # Modelo de datos Supabase
├── postman/
│   └── G10-Reporteria.postman_collection.json
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

## Dependencias externas (contratos E1)

| Grupo | Dominio | Tipo | Criticidad |
|-------|---------|------|-----------|
| G5 | Órdenes | Supabase Realtime consumer | 🔴 Crítica |
| G6 | Pagos | Supabase Realtime consumer | 🔴 Crítica |
| G3 | Catálogo | REST consumer | 🟠 Alta |
| G8 | Shipment | REST consumer | 🟡 Media |

---

**G10 — FishMarket Cloud** · Dominio: Reportería / Batch / Streaming
