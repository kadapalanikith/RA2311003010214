'use strict';

require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const { requestLogger } = require('../logging_middleware');
const { Log }           = require('../logging_middleware/logger');

const notificationRoutes = require('./src/route/notificationRoutes');
const errorHandler       = require('./src/middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => Log('backend', 'info', 'db', 'MongoDB connected'))
  .catch((err) => Log('backend', 'fatal', 'db', `MongoDB connection failed: ${err.message}`));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(requestLogger);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/notifications', notificationRoutes);

// Health
app.get('/health', (_req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.status(200).json({
    status: 'ok',
    service: 'notification-app-be',
    db: dbState[mongoose.connection.readyState] || 'unknown',
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  Log('backend', 'info', 'service', `Notification backend running on port ${PORT}`);
});

module.exports = app;
