import { useEffect, useRef, useState } from "react";

// Animates a numeric value from its previous value to `target` over `duration`ms,
// calling `format` on each intermediate frame.
export function useCountUp(target, { duration = 700, format = (n) => n } = {}) {
  const [display, setDisplay] = useState(() => (typeof target === "number" ? format(0) : target));
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number" || Number.isNaN(target)) {
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const value = from + (target - from) * eased;
      setDisplay(format(value));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}
