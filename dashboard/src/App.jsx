import { useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import DashboardPage from "./pages/DashboardPage";
import { isLoggedIn, isExpiringSoon, getRefreshToken, getUser, refreshSession, clearSession } from "./api/auth";
import { refreshToken as g2Refresh } from "./api/g2Auth";
import { useTheme } from "./hooks/useTheme";

const KEEPALIVE_INTERVAL_MS = 60_000;

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      className="btn icon-btn" type="button" onClick={onToggle}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState(getUser());
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    clearSession();
    setLoggedIn(false);
    setUser(null);
  }

  function handleLogin() {
    setUser(getUser());
    setLoggedIn(true);
  }

  // Mantiene la sesión viva: si el access_token está por vencer,
  // lo refresca en silencio contra G2 antes de que el usuario note un 401.
  useEffect(() => {
    if (!loggedIn) return undefined;
    const timer = setInterval(async () => {
      if (!isExpiringSoon()) return;
      const rt = getRefreshToken();
      if (!rt) return;
      try {
        await g2Refresh(rt).then(refreshSession);
      } catch {
        handleLogout();
      }
    }, KEEPALIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loggedIn]);

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__title">
          <h1>G10 Reportería</h1>
          <span>Batch · Streaming · FishMarket Cloud</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user?.email && <span className="status-pill">{user.email}</span>}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="btn" type="button" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>
      <DashboardPage onLogout={handleLogout} />
    </div>
  );
}
