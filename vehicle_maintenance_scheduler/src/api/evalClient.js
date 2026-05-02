'use strict';

const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.EVAL_BASE_URL || 'http://20.207.122.201/evaluation-service';

/**
 * Generic HTTP GET helper — uses only Node built-ins.
 *
 * @param {string} path - e.g. '/depots' or '/vehicles'
 * @returns {Promise<any>}
 */
function get(path) {
  return new Promise((resolve, reject) => {
    const endpoint = new URL(`${BASE_URL}${path}`);
    const token = process.env.EVAL_ACCESS_TOKEN;

    const options = {
      hostname: endpoint.hostname,
      port: endpoint.port || 80,
      path: endpoint.pathname,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 8000,
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error(`Failed to parse response from ${path}: ${e.message}`));
        }
      });
    });

    req.on('timeout', () => req.destroy(new Error(`GET ${path} timed out`)));
    req.on('error', reject);
    req.end();
  });
}

async function fetchDepots() {
  const data = await get('/depots');
  return data.depots;
}

async function fetchVehicles() {
  const data = await get('/vehicles');
  // API may return array directly or nested under a key
  return Array.isArray(data) ? data : data.vehicles || data.tasks || [];
}

module.exports = { fetchDepots, fetchVehicles };
