import { useEffect, useRef, useState } from "react";

// Shared crosshair/hover tooltip. Position it via `show(x, y, content)`.
export function useTooltip() {
  const [state, setState] = useState({ visible: false, x: 0, y: 0, content: null });
  const nodeRef = useRef(null);

  function show(x, y, content) {
    setState({ visible: true, x, y, content });
  }
  function hide() {
    setState((s) => ({ ...s, visible: false }));
  }

  return { tooltipProps: { state, nodeRef }, show, hide };
}

export default function Tooltip({ state, nodeRef }) {
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!state.visible || !nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = state.x + 14;
    let top = state.y - rect.height / 2;
    if (left + rect.width > vw - 8) left = state.x - rect.width - 14;
    if (top < 8) top = 8;
    if (top + rect.height > vh - 8) top = vh - rect.height - 8;
    setPos({ left, top });
  }, [state, nodeRef]);

  return (
    <div
      ref={nodeRef}
      className={`fixed z-50 min-w-[150px] rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs text-white shadow-xl transition-opacity ${
        state.visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ left: pos.left, top: pos.top }}
    >
      {state.content}
    </div>
  );
}
