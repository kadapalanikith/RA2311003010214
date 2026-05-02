'use strict';

/**
 * Notification Service — business logic layer.
 *
 * Wraps the repository with:
 *  - Caching (Stage 4)
 *  - Priority scoring (Stage 6)
 *  - Validation / transformation
 */

const repo  = require('../repository/notificationRepository');
const cache = require('../cache/notificationCache');
const { Log } = require('../../../logging_middleware/logger');

// ── Create ──────────────────────────────────────────────────────────────────

async function createNotification(data) {
  const notification = await repo.create(data);
  // Invalidate this student's cached inbox
  cache.invalidate(
    `inbox:${data.studentID}`,
    `unread:${data.studentID}`
  );
  Log('backend', 'info', 'service', `Notification created: ${notification._id}`);
  return notification;
}

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Stage 3: Get unread notifications for a student.
 * Supports:
 *  - ?days=7             → last 7 days
 *  - ?types=Placement    → filter by type
 */
async function getUnreadNotifications(studentID, opts = {}) {
  const cacheKey = `unread:${studentID}:${JSON.stringify(opts)}`;
  const cached   = cache.get(cacheKey);
  if (cached) {
    Log('backend', 'debug', 'cache', `Cache HIT for ${cacheKey}`);
    return cached;
  }

  const data = await repo.findUnreadByStudent(studentID, opts);
  cache.set(cacheKey, data);
  return data;
}

/**
 * Stage 6: Priority inbox — top 10–15 notifications by composite score.
 * Scoring: type weight + recency + unread status.
 */
async function getPriorityInbox(studentID, limit = 10) {
  const cacheKey = `inbox:${studentID}:${limit}`;
  const cached   = cache.get(cacheKey);
  if (cached) {
    Log('backend', 'debug', 'cache', `Cache HIT for priority inbox ${studentID}`);
    return cached;
  }

  const data = await repo.getPriorityInbox(studentID, limit);
  cache.set(cacheKey, data);
  return data;
}

// ── Update ──────────────────────────────────────────────────────────────────

async function markAsRead(notificationID, studentID) {
  const updated = await repo.markAsRead(notificationID);
  if (!updated) {
    const err = new Error('Notification not found');
    err.status = 404;
    throw err;
  }
  cache.invalidate(`inbox:${studentID}`, `unread:${studentID}`);
  return updated;
}

// ── Sync from evaluation-service ────────────────────────────────────────────

async function syncFromEvalService() {
  const http = require('http');
  // Lazy import to avoid circular deps in tests

  // Using evalClient pattern from vehicle scheduler
  const { fetchNotifications } = require('../api/evalClient');

  Log('backend', 'info', 'service', 'Syncing notifications from evaluation-service');
  const notifications = await fetchNotifications();
  const result = await repo.bulkUpsert(notifications);
  Log('backend', 'info', 'service', `Synced ${notifications.length} notifications`);
  return result;
}

module.exports = {
  createNotification,
  getUnreadNotifications,
  getPriorityInbox,
  markAsRead,
  syncFromEvalService,
};
