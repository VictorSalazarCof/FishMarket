import { useEffect, useState } from "react";
import { fetchHealth } from "../api";

export default function HealthPill({ live }) {
  const [state, setState] = useState({ ok: false, text: "Verificando servicio…" });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const h = await fetchHealth();
        const dbState = h.persistence?.connected
          ? "Supabase conectada"
          : h.persistence?.configured
            ? "Supabase configurada, sin conexión"
            : "datos mock (sin DB)";
        if (!cancelled) {
          setState({ ok: true, text: `Servicio activo · ${dbState} · ${h.wsClients} cliente(s) WS` });
        }
      } catch (err) {
        if (!cancelled) setState({ ok: false, text: `Servicio no disponible — ${err.message}` });
      }
    }

    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow-sm">
      <span className="flex items-center gap-2" role="status" aria-live="polite">
        <span
          className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${
            state.ok ? "animate-pulse-dot bg-emerald-500" : "bg-red-500"
          }`}
        />
        {state.text}
      </span>

      {live && (
        <>
          <span className="h-3.5 w-px bg-slate-200" />
          <span
            className="flex items-center gap-1.5"
            title={live.connected ? "WebSocket en vivo conectado" : "WebSocket reconectando…"}
          >
            <span className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${live.connected ? "bg-indigo-500" : "bg-slate-300"}`} />
            {live.connected ? "En vivo" : "Reconectando…"}
            {live.alerts.length > 0 && (
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                {live.alerts.length} alerta{live.alerts.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}
