// Hook que escucha los eventos emitidos por src/websocket/broadcaster.js
// (backend): ORDER_DASHBOARD_REFRESH (integración G9→G5, streaming),
// batch:queued/running/completed/failed, inventory:alert, report:updated.
// Reconecta con backoff si el server cae (Render free tier duerme).

import { useEffect, useRef, useState, useCallback } from "react";

const MAX_EVENTS = 60;
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 15000;

function wsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function useDashboardSocket() {
  const [status, setStatus] = useState("connecting"); // connecting | open | closed
  const [events, setEvents] = useState([]);
  const listenersRef = useRef(new Set());
  const attemptRef = useRef(0);
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  const onEvent = useCallback((handler) => {
    listenersRef.current.add(handler);
    return () => listenersRef.current.delete(handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      const ws = new WebSocket(wsUrl());
      socketRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("open");
      };

      ws.onmessage = (raw) => {
        let msg;
        try { msg = JSON.parse(raw.data); } catch { return; }
        if (msg.type === "connected" || msg.type === "pong") return;

        const enriched = { ...msg, receivedAt: new Date().toISOString() };
        setEvents((prev) => [enriched, ...prev].slice(0, MAX_EVENTS));
        listenersRef.current.forEach((handler) => handler(enriched));
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attemptRef.current, RECONNECT_MAX_MS);
        attemptRef.current += 1;
        timeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      socketRef.current?.close();
    };
  }, []);

  return { status, events, onEvent };
}
