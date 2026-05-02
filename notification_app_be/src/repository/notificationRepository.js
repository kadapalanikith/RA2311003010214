'use strict';

const Notification = require('../domain/Notification');
const { Log } = require('../../../logging_middleware/logger');

/**
 * Repository layer — all DB interactions live here.
 * Controllers and services never touch Mongoose directly.
 */

/**
 * Create a new notification record.
 * @param {Object} data
 * @returns {Promise<Notification>}
 */
async function create(data) {
  Log('backend', 'debug', 'repository', `Creating notification for studentID=${data.studentID}`);
  return Notification.create(data);
}

/**
 * Stage 3 — optimised query:
 * "Get all unread notifications for a student, newest first"
 * Uses the compound index { studentID, isRead, createdAt }.
 *
 * @param {number} studentID
 * @param {Object} opts
 * @returns {Promise<Notification[]>}
 */
async function findUnreadByStudent(studentID, opts = {}) {
  const {
    limit      = 50,
    days       = null,    // filter to last N days
    types      = null,    // array of type strings to include
  } = opts;

  const filter = { studentID: Number(studentID), isRead: false };

  if (days) {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    filter.createdAt = { $gte: cutoff };
  }

  if (types && types.length > 0) {
    filter.type = { $in: types };
  }

  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Stage 6 — Priority inbox.
 * Returns top N notifications sorted by importanceScore desc, then createdAt desc.
 *
 * @param {number} studentID
 * @param {number} limit  - default 10
 * @returns {Promise<Notification[]>}
 */
async function getPriorityInbox(studentID, limit = 10) {
  return Notification.find({ studentID: Number(studentID) })
    .sort({ importanceScore: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Mark a notification as read.
 */
async function markAsRead(notificationID) {
  return Notification.findByIdAndUpdate(
    notificationID,
    { isRead: true },
    { new: true }
  ).lean();
}

/**
 * Bulk upsert from the evaluation-service feed (Stage 2).
 * idempotent — won't duplicate based on external ID.
 */
async function bulkUpsert(items) {
  const ops = items.map((item) => ({
    updateOne: {
      filter: { _id: item.ID },          // use external ID if provided
      update: { $setOnInsert: item },
      upsert: true,
    },
  }));
  return Notification.bulkWrite(ops, { ordered: false });
}

/**
 * Get all notifications (admin / seed use).
 */
async function findAll(filter = {}, limit = 100) {
  return Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  create,
  findUnreadByStudent,
  getPriorityInbox,
  markAsRead,
  bulkUpsert,
  findAll,
};
