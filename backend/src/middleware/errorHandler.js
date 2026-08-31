function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  // Only errors we deliberately threw (with .status set) carry a message
  // that's safe to show a user — an unexpected 500 (e.g. a raw Prisma/DB
  // error) is logged above but never echoed to the client verbatim.
  const message = err.status ? err.message : 'Terjadi kesalahan pada server. Silakan coba lagi.';
  res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };
