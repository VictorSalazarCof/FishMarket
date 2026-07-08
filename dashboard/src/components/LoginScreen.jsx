// Login real contra G2 (POST /auth/login, llamado directo desde el
// navegador — G2 tiene CORS abierto). El rol se valida acá mismo con
// lo que devuelve el login, sin esperar el primer 403 del backend.

import { useState } from "react";
import { login } from "../api/g2Auth";
import { startSession } from "../api/auth";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const data = await login(email.trim(), password);
      if (data.user.role !== "admin") {
        setError(`"${data.user.email}" no tiene rol admin en G2 (rol actual: ${data.user.role}).`);
        return;
      }
      startSession(data);
      onLogin();
    } catch (err) {
      if (err.status === 401) setError("Email o contraseña incorrectos.");
      else if (err.status === 429) setError("Demasiados intentos — esperá un momento y volvé a probar.");
      else setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>G10 Reportería</h1>
        <p>
          Ingresá con tu cuenta <strong>admin</strong> de G2
          (<code>auth-minimarket-cloud.onrender.com</code>).
        </p>
        <div className="filter-field">
          <label htmlFor="email">Email</label>
          <input
            id="email" type="email" value={email} autoFocus required
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password" type="password" value={password} required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="login-card__error">⚠️ {error}</div>}
        <button className="btn btn--primary" type="submit" disabled={checking}>
          {checking ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
