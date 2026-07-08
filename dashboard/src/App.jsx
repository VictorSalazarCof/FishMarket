import { useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen";
import DashboardPage from "./pages/DashboardPage";
import { isLoggedIn, isExpiringSoon, getRefreshToken, getUser, refreshSession, clearSession } from "./api/auth";
import { refreshToken as g2Refresh } from "./api/g2Auth";

const KEEPALIVE_INTERVAL_MS = 60_000;

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState(getUser());

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
          <button className="btn" type="button" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>
      <DashboardPage onLogout={handleLogout} />
    </div>
  );
}
