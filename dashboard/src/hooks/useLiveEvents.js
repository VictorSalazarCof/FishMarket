import { useEffect, useRef, useState } from "react";
import { wsUrl } from "../api";

const MAX_EVENTS = 20;
const MAX_ALERTS = 10;

// Connects to the G10 WebSocket stream and keeps a rolling window of events —
// powers the live health dot and the inventory-alert feed. Reconnects with
// backoff since the free-tier backend can drop idle connections.
export function useLiveEvents() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const socketRef = useRef(null);
  const retryRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl());
      socketRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", channel: "inventory-alerts" }));
      };

      ws.onmessage = (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        setEvents((prev) => [msg, ...prev].slice(0, MAX_EVENTS));
        if (msg.type === "inventory:alert") {
          setAlerts((prev) => [msg, ...prev].slice(0, MAX_ALERTS));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        const delay = Math.min(15_000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        timeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      socketRef.current?.close();
    };
  }, []);

  return { connected, events, alerts };
}
