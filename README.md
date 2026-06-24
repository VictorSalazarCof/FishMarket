# G10 – Reportería / Batch / Streaming
## FishMarket Cloud — Mock API

Servicio mock del dominio **Reportería** del grupo G10. Expone los endpoints de reportes consolidados, resúmenes de ventas, inventario y recalculación batch para que los grupos consumidores puedan avanzar con su integración.

> **Rol de G10:** consumidor de solo lectura. G10 no genera transacciones ni modifica datos. Lee desde G5 (Órdenes) y G6 (Pagos) vía RabbitMQ y expone dashboards agregados.

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio |
| `GET` | `/api/v1/reports/sales-summary` | Resumen de ventas por período |
| `GET` | `/api/v1/reports/products` | Breakdown por producto |
| `GET` | `/api/v1/reports/status` | Conteo de órdenes por estado |
| `GET` | `/api/v1/reports/fulfillment` | Métricas de fulfillment |
| `GET` | `/api/v1/reports/communications` | Estadísticas de comunicaciones |
| `GET` | `/api/v1/reports/order-trends` | Tendencias de pedidos |
| `GET` | `/api/v1/reports/payment-summary` | Resumen de pagos |
| `GET` | `/api/v1/inventory/low-stock` | Productos con stock bajo |
| `POST` | `/api/v1/batch/recalculate` | Disparar recalculación batch |

---

## Query params comunes

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

## Ejemplos de uso

```bash
# Resumen de ventas enero 2025
curl "https://g10-reporteria-mock.onrender.com/api/v1/reports/sales-summary?startDate=2025-01-01&endDate=2025-01-31&groupBy=week"

# Productos con stock crítico (< 5 unidades)
curl "https://g10-reporteria-mock.onrender.com/api/v1/inventory/low-stock?threshold=5"

# Disparar recalculación batch
curl -X POST "https://g10-reporteria-mock.onrender.com/api/v1/batch/recalculate" \
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
# Editar .env si es necesario

npm run dev   # Desarrollo con hot-reload
# o
npm start     # Producción
```

Servidor disponible en `http://localhost:3000`

---

## Despliegue en Render

1. Subir el repositorio a GitHub.
2. Crear un nuevo **Web Service** en [render.com](https://render.com).
3. Apuntar al repositorio, seleccionar rama `main`.
4. Render detecta automáticamente el `render.yaml`.
5. Build: `npm install` | Start: `npm start`.

---

## Modelo de datos

Las tablas Supabase se encuentran en `database/schema.sql`. Las principales son:

| Tabla | Descripción |
|-------|-------------|
| `report_sales_daily` | Ventas diarias consolidadas |
| `report_product_metrics` | Métricas por producto |
| `report_order_status` | Conteo de órdenes por estado |
| `report_inventory_snapshots` | Snapshots de inventario |
| `report_fulfillment_metrics` | KPIs de fulfillment |
| `report_payment_summaries` | Resumen de pagos por método |
| `batch_jobs` | Tracking de jobs de recalculación |
| `streaming_events_log` | Log de eventos RabbitMQ consumidos |

---

## Estructura del proyecto

```
g10-reporteria-mock/
├── src/
│   ├── app.js                  # Entry point Express
│   ├── routes/
│   │   ├── reports.js          # GET endpoints de reportes
│   │   ├── inventory.js        # GET /inventory/low-stock
│   │   └── batch.js            # POST /batch/recalculate
│   └── data/
│       └── mockData.js         # Datos y lógica mock
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

## Dependencias externas (contratos E1)

| Grupo | Dominio | Tipo | Criticidad |
|-------|---------|------|-----------|
| G5 | Órdenes | RabbitMQ consumer | 🔴 Crítica |
| G6 | Pagos | RabbitMQ consumer | 🔴 Crítica |
| G3 | Catálogo | REST consumer | 🟠 Alta |
| G8 | Shipment | REST consumer | 🟡 Media |

---

## Grupo

**G10 — FishMarket Cloud**  
Dominio: Reportería / Batch / Streaming
