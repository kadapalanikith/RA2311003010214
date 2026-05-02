'use strict';

/**
 * Simple in-process cache (Stage 4 — caching layer).
 *
 * In production this would be Redis. This implementation:
 *  - Stores entries with a TTL
 *  - Falls through to the DB on miss
 *  - Uses the same API surface so Redis can be a drop-in replacement
 *
 * See notification_system_design.md Stage 4 for full tradeoff analysis.
 */

const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_SECONDS) || 60) * 1000;
const store = new Map();

/**
 * Get a value from cache.
 * @param {string} key
 * @returns {any|null}
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Set a value in cache with TTL.
 * @param {string} key
 * @param {any}    value
 * @param {number} [ttlMs]
 */
function set(key, value, ttlMs = CACHE_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate one or more cache keys.
 * @param {...string} keys
 */
function invalidate(...keys) {
  keys.forEach((k) => store.delete(k));
}

/** Flush everything (e.g., on server restart for testing). */
function flush() {
  store.clear();
}

module.exports = { get, set, invalidate, flush };
