'use strict';

require('dotenv').config();

const express = require('express');
const { requestLogger } = require('../logging_middleware');
const schedulerRoutes   = require('./src/route/schedulerRoutes');
const errorHandler      = require('./src/middleware/errorHandler');
const { Log }           = require('../logging_middleware/logger');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(requestLogger);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/schedule', schedulerRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'vehicle-maintenance-scheduler' });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error Handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  Log('backend', 'info', 'service', `Vehicle Maintenance Scheduler running on port ${PORT}`);
});

module.exports = app;
