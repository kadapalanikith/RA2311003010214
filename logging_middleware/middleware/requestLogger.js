'use strict';

/**
 * Express request/response logging middleware.
 *
 * Logs every incoming request and its corresponding response automatically.
 * Integrates with the Log() function so all HTTP traffic is observable
 * both locally and on the remote evaluation-service.
 *
 * Usage (in your Express app):
 *   const { requestLogger } = require('../logging_middleware');
 *   app.use(requestLogger);
 */

const { Log } = require('../logger');

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                   next
 */
function requestLogger(req, res, next) {
  const startedAt = Date.now();
  const { method, originalUrl, ip } = req;

  // Log the incoming request
  Log('backend', 'info', 'middleware', `→ ${method} ${originalUrl} from ${ip}`);

  // Intercept response finish event to log response details
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    const { statusCode } = res;

    const level = statusCode >= 500
      ? 'error'
      : statusCode >= 400
        ? 'warn'
        : 'info';

    Log(
      'backend',
      level,
      'middleware',
      `← ${method} ${originalUrl} ${statusCode} (${duration}ms)`
    );
  });

  next();
}

module.exports = requestLogger;
