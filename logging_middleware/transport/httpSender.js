'use strict';

/**
 * Async, non-blocking HTTP sender for the evaluation-service Log API.
 *
 * Design decisions:
 * - Uses Node's built-in `https`/`http` — zero external dependencies.
 * - Fires-and-forgets by default so logging never blocks the request path.
 * - Optionally awaitable when callers need confirmation (e.g., integration tests).
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { LOG_API_ENDPOINT } = require('../config/constants');
const { getAuthToken } = require('../config/auth');

/**
 * Send a single log entry to the evaluation-service.
 *
 * @param {Object} payload  - { stack, level, package, message }
 * @returns {Promise<Object>} Resolves with { logID, message } from the server
 */
function sendLog(payload) {
  return new Promise((resolve, reject) => {
    let token;
    try {
      token = getAuthToken();
    } catch (err) {
      // If no token is configured we still emit locally — don't crash the app
      return reject(err);
    }

    const body = JSON.stringify(payload);
    const endpoint = new URL(LOG_API_ENDPOINT);
    const isHttps = endpoint.protocol === 'https:';
    const transport = isHttps ? https : http;

    const options = {
      hostname: endpoint.hostname,
      port: endpoint.port || (isHttps ? 443 : 80),
      path: endpoint.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000, // 5 s hard timeout — logging must never stall the app
    };

    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          resolve(parsed);
        } catch {
          resolve({ raw: Buffer.concat(chunks).toString() });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Log API request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

module.exports = { sendLog };
