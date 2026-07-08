// Panel de bajo stock. Consume GET /api/v1/inventory/low-stock y se
// refresca solo cuando llega un evento inventory:alert por WebSocket.

import { useEffect, useState } from "react";
import { fetchLowStock } from "../api/reports";

const URGENCY_BADGE = { critical: "badge--critical", high: "badge--serious", medium: "badge--warning" };
const URGENCY_LABEL = { critical: "Crítico", high: "Alto", medium: "Medio" };

export default function LowStockPanel({ socket }) {
  const [threshold, setThreshold] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchLowStock({ threshold });
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [threshold]);

  useEffect(() => {
    if (!socket) return undefined;
    return socket.onEvent((evt) => {
      if (evt.type === "inventory:alert") load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, threshold]);

  const products = data?.products || [];

  return (
    <div className={`card ${loading ? "is-loading" : ""}`}>
      <div className="card__header">
        <div>
          <h3 className="card__title">Stock bajo</h3>
          <p className="card__subtitle">{products.length} producto(s) bajo el umbral</p>
        </div>
        <div className="filter-field">
          <label htmlFor="threshold">Umbral</label>
          <select id="threshold" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
            {[5, 10, 15, 20].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="card__body table-wrap">
        {products.length === 0 ? (
          <p className="empty-state">Sin productos bajo el umbral seleccionado.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Urgencia</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.currentStock}</td>
                  <td>
                    <span className={`badge ${URGENCY_BADGE[p.urgency] || "badge--neutral"}`}>
                      {URGENCY_LABEL[p.urgency] || p.urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
