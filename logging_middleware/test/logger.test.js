'use strict';

/**
 * Smoke tests for the logging middleware.
 * Run: node test/logger.test.js
 *
 * Uses only Node built-ins — no external test runner.
 */

const assert = require('assert');
const { validateLogPayload } = require('../utils/validator');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}\n     ${err.message}`);
    failed++;
  }
}

console.log('\n=== Logging Middleware Tests ===\n');

test('accepts valid backend/error/handler payload', () => {
  assert.doesNotThrow(() =>
    validateLogPayload('backend', 'error', 'handler', 'received string, expected bool')
  );
});

test('accepts valid frontend/warn/component payload', () => {
  assert.doesNotThrow(() =>
    validateLogPayload('frontend', 'warn', 'component', 'missing prop warning')
  );
});

test('accepts common package (auth) for backend', () => {
  assert.doesNotThrow(() =>
    validateLogPayload('backend', 'info', 'auth', 'token verified')
  );
});

test('rejects invalid stack', () => {
  assert.throws(
    () => validateLogPayload('mobile', 'info', 'handler', 'msg'),
    /Invalid stack/
  );
});

test('rejects invalid level', () => {
  assert.throws(
    () => validateLogPayload('backend', 'trace', 'handler', 'msg'),
    /Invalid level/
  );
});

test('rejects frontend package on backend stack', () => {
  assert.throws(
    () => validateLogPayload('backend', 'info', 'component', 'msg'),
    /Invalid package/
  );
});

test('rejects empty message', () => {
  assert.throws(
    () => validateLogPayload('backend', 'info', 'handler', '   '),
    /non-empty string/
  );
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
