'use strict';

/**
 * Global error-handling middleware.
 * Must be the LAST middleware registered in app.js.
 */
const { Log } = require('../../../logging_middleware/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    Log('backend', 'fatal', 'handler', `Unhandled error: ${message}`);
  }

  return res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
