// ============================================================
// G10 – WebSocket Server
// Streaming de eventos en tiempo real para dashboards
// ============================================================

const WebSocket = require("ws");
const { addClient, broadcast, getClientCount } = require("./broadcaster");
const { getLowStock } = require("../data/mockData");

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    console.log(`✅ WebSocket client connected. Total: ${getClientCount() + 1}`);
    addClient(ws);

    // Mensaje de bienvenida
    ws.send(JSON.stringify({
      type:      "connected",
      message:   "Conectado a G10 Reportería — Stream de eventos en tiempo real",
      endpoints: [
        "batch:queued     → cuando se encola un job de recalculación",
        "batch:running    → progreso del job en ejecución",
        "batch:completed  → job finalizado correctamente",
        "inventory:alert  → productos con stock crítico",
        "report:updated   → tabla de reporte actualizada",
      ],
      timestamp: new Date().toISOString(),
    }));

    // Manejo de mensajes del cliente
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        }

        if (msg.type === "subscribe" && msg.channel === "inventory-alerts") {
          // Enviar alerta inmediata al suscribirse
          const low = getLowStock({ threshold: 10 });
          ws.send(JSON.stringify({
            type:      "inventory:alert",
            products:  low.products,
            threshold: 10,
            timestamp: new Date().toISOString(),
          }));
        }
      } catch {
        // Ignorar mensajes malformados
      }
    });

    ws.on("error", (err) => console.error("WebSocket error:", err.message));
  });

  // ── Alerta periódica de inventario crítico (cada 60s) ────────────────────
  setInterval(() => {
    const low = getLowStock({ threshold: 5 });
    const critical = low.products.filter(p => p.urgency === "critical");
    if (critical.length > 0) {
      broadcast({
        type:     "inventory:alert",
        severity: "critical",
        message:  `${critical.length} producto(s) con stock crítico`,
        products: critical,
      });
    }
  }, 60_000);

  console.log("🔌 WebSocket server listo en /ws");
  return wss;
}

module.exports = { setupWebSocket };
