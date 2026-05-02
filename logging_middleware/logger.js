'use strict';

/**
 * Core Log() function — the public API for the logging middleware.
 *
 * Architecture:
 *  1. Validate all fields synchronously (fail fast, clear errors)
 *  2. Emit to local console immediately (non-blocking, always visible)
 *  3. Ship to remote evaluation-service asynchronously (fire-and-forget)
 *     → Errors from the remote are caught and printed; they NEVER propagate
 *       to the caller so the application request path is never blocked.
 *
 * Usage:
 *   const { Log } = require('./logging_middleware/logger');
 *   Log('backend', 'error', 'handler', 'received string, expected bool');
 */

const { validateLogPayload } = require('./utils/validator');
const { emitLocal }          = require('./utils/consoleEmitter');
const { sendLog }            = require('./transport/httpSender');

/**
 * @param {string} stack   - 'backend' | 'frontend'
 * @param {string} level   - 'debug' | 'info' | 'warn' | 'error' | 'fatal'
 * @param {string} pkg     - package name from the allowed list
 * @param {string} message - human-readable log message
 */
function Log(stack, level, pkg, message) {
  // 1. Validate — throws synchronously on bad input
  validateLogPayload(stack, level, pkg, message);

  // 2. Local console — synchronous, zero latency for the caller
  emitLocal(stack, level, pkg, message);

  // 3. Remote API — fire-and-forget in the background
  const payload = { stack, level, package: pkg, message };

  setImmediate(() => {
    sendLog(payload).catch((err) => {
      // Log transport failure to stderr without crashing the app
      process.stderr.write(
        `[LOGGER] Remote log delivery failed: ${err.message}\n`
      );
    });
  });
}

module.exports = { Log };
