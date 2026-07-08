// ============================================================
// G10 – Middleware de autorización admin (integración G2)
// ============================================================
// Valida el token contra el servicio de autenticación de G2 y
// solo deja pasar si el usuario tiene rol admin.

const crypto = require("crypto");
const { AppError, asyncHandler } = require("../utils/errors");

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "https://auth-minimarket-cloud.onrender.com";
const AUTH_VALIDATE_PATH = process.env.AUTH_VALIDATE_PATH || "/auth/validate";
const AUTH_TIMEOUT_MS = parseInt(process.env.AUTH_TIMEOUT_MS || "5000", 10);
const ADMIN_ROLE_VALUE = process.env.ADMIN_ROLE_VALUE || "admin";

// El nombre exacto del campo de rol en la respuesta de G2 no está
// 100% confirmado (no se pudo probar con un token admin real) —
// se maneja tanto `role` (string) como `roles` (array).
function extractRole(identity) {
  if (typeof identity.role === "string") return identity.role;
  if (Array.isArray(identity.roles)) return identity.roles[0];
  return null;
}

const adminOnly = asyncHandler(async (req, res, next) => {
  const correlationId =
    req.headers["x-correlation-id"] || req.headers["x-request-id"] || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-Id", correlationId);

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Unauthorized", "Falta el header Authorization con un Bearer token.", "MISSING_TOKEN");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${AUTH_SERVICE_URL}${AUTH_VALIDATE_PATH}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "X-Correlation-Id": correlationId,
        "X-Request-Id": correlationId,
        "X-Consumer": "g10-reporteria",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new AppError(504, "Gateway Timeout", `G2 no respondió en ${AUTH_TIMEOUT_MS}ms.`, "AUTH_SERVICE_TIMEOUT");
    }
    throw new AppError(502, "Bad Gateway", `Error al contactar a G2: ${err.message}`, "AUTH_SERVICE_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    throw new AppError(401, "Unauthorized", "El token entregado por G2 es inválido o expiró.", "INVALID_TOKEN");
  }
  if (response.status === 403) {
    throw new AppError(403, "Forbidden", "La cuenta está deshabilitada en G2.", "ACCOUNT_DISABLED");
  }
  if (!response.ok) {
    throw new AppError(502, "Bad Gateway", `G2 respondió con estado inesperado: ${response.status}`, "AUTH_SERVICE_UNAVAILABLE");
  }

  const identity = await response.json();
  const role = extractRole(identity);

  if (role !== ADMIN_ROLE_VALUE) {
    throw new AppError(403, "Forbidden", "Solo usuarios con rol admin pueden acceder al dashboard.", "FORBIDDEN_NOT_ADMIN");
  }

  req.user = identity;
  next();
});

module.exports = { adminOnly };
