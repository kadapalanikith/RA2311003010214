'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.EVAL_BASE_URL || 'http://20.207.122.201/evaluation-service';

function get(path) {
  return new Promise((resolve, reject) => {
    const endpoint = new URL(`${BASE_URL}${path}`);
    const token = process.env.EVAL_ACCESS_TOKEN;
    const transport = endpoint.protocol === 'https:' ? https : http;

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

    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error(`Parse error from ${path}: ${e.message}`));
        }
      });
    });

    req.on('timeout', () => req.destroy(new Error(`GET ${path} timed out`)));
    req.on('error', reject);
    req.end();
  });
}

async function fetchNotifications() {
  const data = await get('/notifications');
  return data.notifications || [];
}

module.exports = { fetchNotifications };
