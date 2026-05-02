'use strict';

const mongoose = require('mongoose');

/**
 * Notification Schema
 *
 * Stage 2: NoSQL schema design for MongoDB.
 *
 * Indexes (Stage 3 optimization):
 *   - { studentID: 1, isRead: 1, createdAt: -1 }  — covers the exact slow query
 *   - { type: 1 }                                   — for type-filtered fetches
 *   - { createdAt: -1 }                             — for recency-based sorts
 *
 * Fields added per Stage 3 requirement:
 *   - rules      : Array of business rules applied (e.g. "placement-priority")
 *   - placement  : Placement-specific metadata (company, role, deadline)
 */
const notificationSchema = new mongoose.Schema(
  {
    studentID: {
      type: Number,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['Placement', 'Event', 'Result'],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Stage 3: Rules field — which priority/business rules apply
    rules: {
      type: [String],
      default: [],
    },

    // Stage 3: Placement-specific metadata (only populated when type = 'Placement')
    placement: {
      company:  { type: String, default: null },
      role:     { type: String, default: null },
      deadline: { type: Date,   default: null },
    },

    // Stage 6: Computed importance score for priority inbox sorting
    importanceScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    versionKey: false,
  }
);

// ── Compound Indexes (Stage 3 optimization) ────────────────────────────────
// Covers: WHERE studentID = ? AND isRead = false ORDER BY createdAt DESC
notificationSchema.index({ studentID: 1, isRead: 1, createdAt: -1 });

// Supports type-filtered queries including Placement notifications
notificationSchema.index({ type: 1, createdAt: -1 });

// ── Pre-save hook: compute importanceScore (Stage 6) ───────────────────────
notificationSchema.pre('save', function (next) {
  const TYPE_WEIGHT = { Placement: 100, Event: 50, Result: 30 };
  const recencyBonus = Math.max(0, 30 - daysSince(this.createdAt));

  this.importanceScore =
    (TYPE_WEIGHT[this.type] || 0) +
    recencyBonus +
    (this.isRead ? 0 : 10); // unread bonus

  next();
});

function daysSince(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

module.exports = mongoose.model('Notification', notificationSchema);
