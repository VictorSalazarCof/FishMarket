// Cliente directo del navegador contra G2 (Identity Service). G2 expone
// CORS abierto (Access-Control-Allow-Origin: *, confirmado en vivo), así
// que el login/refresh no necesitan pasar por nuestro backend.

const G2_AUTH_URL = import.meta.env.VITE_G2_AUTH_URL || "https://auth-minimarket-cloud.onrender.com";

async function g2Post(path, body) {
  const res = await fetch(`${G2_AUTH_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.message) || `G2 respondió ${res.status}`);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

export function login(email, password) {
  return g2Post("/auth/login", { email, password });
}

export function refreshToken(refresh_token) {
  return g2Post("/auth/refresh", { refresh_token });
}
