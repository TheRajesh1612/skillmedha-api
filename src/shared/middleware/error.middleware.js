'use strict';

/**
 * Centralized error handler middleware.
 * Must be registered LAST in the middleware chain.
 */
function errorMiddleware(err, req, res, next) {
  console.error('[ERROR]', {
    message: err.message,
    url: req.url,
    method: req.method,
    stack: err.stack,
  });

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { errorMiddleware };
