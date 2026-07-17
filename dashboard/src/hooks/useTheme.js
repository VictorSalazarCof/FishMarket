// Preferencia de tema explícita del usuario, persistida en localStorage.
// Si nunca la tocó, se respeta prefers-color-scheme del sistema (ver
// index.css). Al tocar el botón, se fija un valor explícito que gana
// siempre — en ambas direcciones — sobre la preferencia del sistema.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "g10-theme";

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
