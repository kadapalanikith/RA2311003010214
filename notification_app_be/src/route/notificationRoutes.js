'use strict';

const express = require('express');
const router  = express.Router();

const ctrl = require('../controller/notificationController');
const {
  createNotificationRules,
  getUnreadRules,
  priorityInboxRules,
  markReadRules,
} = require('../middleware/validators');

/**
 * @route  POST /api/notifications
 * @desc   Create a notification
 * @access Public (auth assumed pre-authorised per evaluation spec)
 */
router.post('/', createNotificationRules, ctrl.createNotification);

/**
 * @route  GET /api/notifications/inbox
 * @desc   Priority inbox (Stage 6)
 * @query  studentID, limit (1-15)
 */
router.get('/inbox', priorityInboxRules, ctrl.getPriorityInbox);

/**
 * @route  GET /api/notifications/unread
 * @desc   Unread notifications for a student (Stage 3)
 * @query  studentID, days, types, limit
 */
router.get('/unread', getUnreadRules, ctrl.getUnread);

/**
 * @route  POST /api/notifications/sync
 * @desc   Sync from evaluation-service
 */
router.post('/sync', ctrl.syncNotifications);

/**
 * @route  PATCH /api/notifications/:id/read
 * @desc   Mark notification as read
 */
router.patch('/:id/read', markReadRules, ctrl.markAsRead);

module.exports = router;
