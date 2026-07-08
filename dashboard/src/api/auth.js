// Sesión real de G2 (Supabase Auth vía /auth/login) en localStorage:
// access_token + refresh_token + expiración + perfil del usuario.

const STORAGE_KEY = "g10_g2_session";

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

// Login: guarda todo, incluido el perfil (user) que trae el rol.
export function startSession({ access_token, refresh_token, expires_in, user }) {
  return write({
    access_token,
    refresh_token,
    expires_at: Date.now() + expires_in * 1000,
    user,
  });
}

// Refresh: /auth/refresh no vuelve a mandar `user`, así que se conserva
// el que ya teníamos guardado.
export function refreshSession({ access_token, refresh_token, expires_in }) {
  const current = read();
  return write({
    access_token,
    refresh_token,
    expires_at: Date.now() + expires_in * 1000,
    user: current?.user || null,
  });
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return read()?.access_token || null;
}

export function getRefreshToken() {
  return read()?.refresh_token || null;
}

export function getUser() {
  return read()?.user || null;
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function isExpiringSoon(marginMs = 5 * 60 * 1000) {
  const session = read();
  if (!session) return false;
  return session.expires_at - Date.now() < marginMs;
}
