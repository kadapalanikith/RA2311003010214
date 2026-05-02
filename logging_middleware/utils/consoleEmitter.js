'use strict';

/**
 * Local console emitter.
 *
 * Provides coloured, human-readable console output regardless of whether the
 * remote log API is reachable. This keeps the developer experience intact even
 * without an active token during local development.
 */

const LEVEL_COLOURS = {
  debug: '\x1b[36m',  // cyan
  info:  '\x1b[32m',  // green
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
  fatal: '\x1b[35m',  // magenta
};
const RESET = '\x1b[0m';

/**
 * @param {string} stack
 * @param {string} level
 * @param {string} pkg
 * @param {string} message
 */
function emitLocal(stack, level, pkg, message) {
  const colour = LEVEL_COLOURS[level] || '';
  const ts = new Date().toISOString();
  const label = `[${ts}] ${colour}${level.toUpperCase()}${RESET} [${stack}/${pkg}]`;
  // Route errors and fatals to stderr
  if (level === 'error' || level === 'fatal') {
    process.stderr.write(`${label} ${message}\n`);
  } else {
    process.stdout.write(`${label} ${message}\n`);
  }
}

module.exports = { emitLocal };
