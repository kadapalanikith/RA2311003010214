'use strict';

const { body, param, query, validationResult } = require('express-validator');
const { Log } = require('../../../logging_middleware/logger');

/**
 * Centralized validation middleware factory.
 * Returns an array of rules + the result-checker middleware.
 */

function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        Log('backend', 'warn', 'middleware', `Validation failed: ${JSON.stringify(errors.array())}`);
        return res.status(422).json({
          success: false,
          errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
      }
      next();
    },
  ];
}

// ── Rule sets ────────────────────────────────────────────────────────────────

const createNotificationRules = validate([
  body('studentID')
    .isInt({ min: 1 })
    .withMessage('studentID must be a positive integer'),
  body('type')
    .isIn(['Placement', 'Event', 'Result'])
    .withMessage('type must be one of: Placement, Event, Result'),
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('message must be a non-empty string (max 500 chars)'),
  body('placement.company').optional().isString().trim(),
  body('placement.role').optional().isString().trim(),
  body('placement.deadline').optional().isISO8601().withMessage('deadline must be ISO 8601 date'),
]);

const getUnreadRules = validate([
  query('studentID')
    .isInt({ min: 1 })
    .withMessage('studentID must be a positive integer'),
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('days must be 1–365'),
  query('types')
    .optional()
    .isString()
    .withMessage('types must be a comma-separated string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be 1–100'),
]);

const priorityInboxRules = validate([
  query('studentID')
    .isInt({ min: 1 })
    .withMessage('studentID must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 15 })
    .withMessage('limit must be 1–15 for priority inbox'),
]);

const markReadRules = validate([
  param('id').isMongoId().withMessage('id must be a valid MongoDB ObjectId'),
  body('studentID').isInt({ min: 1 }).withMessage('studentID required'),
]);

module.exports = {
  createNotificationRules,
  getUnreadRules,
  priorityInboxRules,
  markReadRules,
};
