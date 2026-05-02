'use strict';

const svc = require('../service/notificationService');
const { Log } = require('../../../logging_middleware/logger');

/**
 * POST /api/notifications
 * Create a new notification.
 */
async function createNotification(req, res, next) {
  try {
    const notification = await svc.createNotification(req.body);
    Log('backend', 'info', 'controller', `Created notification ${notification._id}`);
    return res.status(201).json({ success: true, data: notification });
  } catch (err) {
    Log('backend', 'error', 'controller', `createNotification failed: ${err.message}`);
    return next(err);
  }
}

/**
 * GET /api/notifications/unread?studentID=&days=&types=&limit=
 * Stage 3: Optimised unread query.
 */
async function getUnread(req, res, next) {
  try {
    const { studentID, days, types, limit } = req.query;
    const opts = {
      days:  days  ? Number(days)  : null,
      types: types ? types.split(',') : null,
      limit: limit ? Number(limit) : 50,
    };
    const notifications = await svc.getUnreadNotifications(Number(studentID), opts);
    return res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    Log('backend', 'error', 'controller', `getUnread failed: ${err.message}`);
    return next(err);
  }
}

/**
 * GET /api/notifications/inbox?studentID=&limit=
 * Stage 6: Priority inbox — top 10–15 by importanceScore.
 */
async function getPriorityInbox(req, res, next) {
  try {
    const { studentID, limit } = req.query;
    const data = await svc.getPriorityInbox(Number(studentID), Number(limit) || 10);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    Log('backend', 'error', 'controller', `getPriorityInbox failed: ${err.message}`);
    return next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read.
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const { studentID } = req.body;
    const updated = await svc.markAsRead(id, studentID);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    Log('backend', 'error', 'controller', `markAsRead failed: ${err.message}`);
    return next(err);
  }
}

/**
 * POST /api/notifications/sync
 * Pull latest notifications from the evaluation-service and upsert into DB.
 */
async function syncNotifications(req, res, next) {
  try {
    Log('backend', 'info', 'controller', 'Syncing notifications from evaluation-service');
    const result = await svc.syncFromEvalService();
    return res.status(200).json({ success: true, message: 'Sync complete', result });
  } catch (err) {
    Log('backend', 'error', 'controller', `syncNotifications failed: ${err.message}`);
    return next(err);
  }
}

module.exports = {
  createNotification,
  getUnread,
  getPriorityInbox,
  markAsRead,
  syncNotifications,
};
