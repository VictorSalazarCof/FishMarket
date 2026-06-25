// ============================================================
// G10 – WebSocket Broadcaster
// Gestiona clientes conectados y emite eventos en tiempo real
// ============================================================

const clients = new Set();

function addClient(ws) {
  clients.add(ws);
  ws.on("close", () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected. Total: ${clients.size}`);
  });
}

function broadcast(message) {
  const data = JSON.stringify({ ...message, timestamp: new Date().toISOString() });
  let sent = 0;
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(data);
      sent++;
    }
  });
  if (sent > 0) console.log(`📡 Broadcast [${message.type}] → ${sent} cliente(s)`);
}

function getClientCount() {
  return clients.size;
}

module.exports = { addClient, broadcast, getClientCount };
