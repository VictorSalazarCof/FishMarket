// ============================================================
// G10 – Manejo estándar de errores
// ============================================================
// Mantiene compatibilidad con el formato ya usado en E2
// ({ error, message }) y agrega "code" + "timestamp" sin
// romper los tests de Postman existentes.

class AppError extends Error {
  constructor(status, error, message, code) {
    super(message);
    this.status = status;
    this.error = error;       // etiqueta corta, ej. "Bad Request"
    this.code = code || error.toUpperCase().replace(/\s+/g, "_");
  }
}

// Envuelve handlers async para que cualquier rechazo de Promise
// (incluyendo errores de DB) llegue al error handler central
// en vez de tirar un UnhandledPromiseRejection.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { AppError, asyncHandler };
