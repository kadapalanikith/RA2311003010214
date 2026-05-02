'use strict';

/**
 * Validation helpers for the Log() function.
 * All constraints come directly from the evaluation-service specification.
 */

const {
  VALID_STACKS,
  VALID_LEVELS,
  VALID_PACKAGES,
  ALL_VALID_PACKAGES,
} = require('../config/constants');

/**
 * Validates a log payload.
 *
 * @param {string} stack
 * @param {string} level
 * @param {string} pkg
 * @param {string} message
 * @throws {TypeError} when any field violates the spec constraints
 */
function validateLogPayload(stack, level, pkg, message) {
  if (!VALID_STACKS.includes(stack)) {
    throw new TypeError(
      `Invalid stack "${stack}". Must be one of: ${VALID_STACKS.join(', ')}`
    );
  }

  if (!VALID_LEVELS.includes(level)) {
    throw new TypeError(
      `Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(', ')}`
    );
  }

  // Package must be valid for the given stack OR be a common package
  const allowedPackages = [
    ...(VALID_PACKAGES[stack] || []),
    ...VALID_PACKAGES.common,
  ];

  if (!allowedPackages.includes(pkg)) {
    throw new TypeError(
      `Invalid package "${pkg}" for stack "${stack}". ` +
        `Allowed: ${allowedPackages.join(', ')}`
    );
  }

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new TypeError('Log message must be a non-empty string.');
  }
}

module.exports = { validateLogPayload };
