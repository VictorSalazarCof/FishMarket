const http    = require("http");
const path    = require("path");
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");

const reportsRouter   = require("./routes/reports");
const inventoryRouter = require("./routes/inventory");
const batchRouter     = require("./routes/batch");
const { setupWebSocket } = require("./websocket/wsServer");
const { getClientCount } = require("./websocket/broadcaster");
const { checkConnection, isConfigured } = require("./db/pool");
const notificationPoller = require("./services/g9NotificationPoller");
const liveIntegrationsSync = require("./services/liveIntegrationsSync");

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.static("public")); // sirve ws-demo.html

// ── Health check ─────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  const db = await checkConnection();
  res.json({
    status:          "ok",
    service:         "G10 – Reportería / Batch / Streaming",
    group:           "G10",
    version:         "1.1.0",
    wsClients:       getClientCount(),
    persistence:     { configured: isConfigured(), connected: db.connected, ...(db.reason ? { reason: db.reason } : {}) },
    timestamp:       new Date().toISOString(),
  });
});

app.get("/api", (_req, res) => {
  res.json({
    message:   "FishMarket Cloud — G10 Reportería Mock API",
    health:    "/health",
    wsDemo:    "/ws-demo.html",
    endpoints: [
      "GET  /api/v1/reports/sales-summary",
      "GET  /api/v1/reports/products",
      "GET  /api/v1/reports/status",
      "GET  /api/v1/reports/fulfillment",
      "GET  /api/v1/reports/communications",
      "GET  /api/v1/reports/order-trends",
      "GET  /api/v1/reports/payment-summary",
      "GET  /api/v1/inventory/low-stock",
      "POST /api/v1/batch/recalculate",
      "WS   /ws  ← eventos en tiempo real",
    ],
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/api/v1/reports",   reportsRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/batch",     batchRouter);

// ── Dashboard estático (build de dashboard/, servido con Vite) ─
// Debe ir después de /api/v1/* para no interceptar esas rutas, y
// antes del 404 genérico para que las rutas del SPA (client-side
// routing) caigan en index.html en vez de 404. Excluye /api y /ws
// explícitamente: sin esto, cualquier ruta de API inexistente
// (ej. /api/v1/ruta-inexistente) también matchea "*" y devuelve el
// index.html del dashboard en vez del 404 JSON esperado. Si
// dashboard/dist no existe todavía (build pendiente), sendFile
// falla y se sigue al 404 normal en vez de tirar un error sin manejar.
app.use(express.static(path.join(__dirname, "../dashboard/dist")));
app.get(/^(?!\/api|\/ws).*/, (req, res, next) => {
  res.sendFile(path.join(__dirname, "../dashboard/dist/index.html"), (err) => {
    if (err) next();
  });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:     "Not Found",
    message:   `Route ${req.method} ${req.path} not found`,
    code:      "NOT_FOUND",
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler ────────────────────────────────────────────
// Compatible con el formato usado en E2 ({error, message}).
// Los errores de validación (AppError) ya traen error/message/code.
// Cualquier otro error (ej. fallas de conexión a DB) cae al
// fallback genérico de 500 sin filtrar detalles internos.
app.use((err, req, res, _next) => {
  console.error(err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    error:         err.error || "Internal Server Error",
    message:       status === 500 ? "Ha ocurrido un error inesperado" : err.message,
    code:          err.code || "INTERNAL_ERROR",
    correlationId: req.correlationId || null,
    timestamp:     new Date().toISOString(),
  });
});

// ── HTTP + WebSocket server ───────────────────────────────────
const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);
setupWebSocket(server);

notificationPoller.start();
process.on("SIGTERM", () => notificationPoller.stop());

liveIntegrationsSync.start();
process.on("SIGTERM", () => liveIntegrationsSync.stop());

server.listen(PORT, () => {
  console.log(`✅  G10 Reportería Mock corriendo en puerto ${PORT}`);
  console.log(`🔌  WebSocket disponible en ws://localhost:${PORT}/ws`);
  console.log(`🌐  Demo WebSocket en http://localhost:${PORT}/ws-demo.html`);
});

module.exports = app;
