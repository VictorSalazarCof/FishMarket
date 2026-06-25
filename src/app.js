const http    = require("http");
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");

const reportsRouter   = require("./routes/reports");
const inventoryRouter = require("./routes/inventory");
const batchRouter     = require("./routes/batch");
const { setupWebSocket } = require("./websocket/wsServer");
const { getClientCount } = require("./websocket/broadcaster");

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.static("public")); // sirve ws-demo.html

// ── Health check ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:          "ok",
    service:         "G10 – Reportería / Batch / Streaming",
    group:           "G10",
    version:         "1.0.0",
    wsClients:       getClientCount(),
    timestamp:       new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
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

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:     "Not Found",
    message:   `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error:     err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
});

// ── HTTP + WebSocket server ───────────────────────────────────
const PORT   = process.env.PORT || 3000;
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`✅  G10 Reportería Mock corriendo en puerto ${PORT}`);
  console.log(`🔌  WebSocket disponible en ws://localhost:${PORT}/ws`);
  console.log(`🌐  Demo WebSocket en http://localhost:${PORT}/ws-demo.html`);
});

module.exports = app;
