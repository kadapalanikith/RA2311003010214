'use strict';

/**
 * DB Seed Script
 *
 * Populates the database with sample notifications for local testing.
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose     = require('mongoose');
const Notification = require('../src/domain/Notification');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error('\n❌ Could not connect to MongoDB.');
    console.error('   Is MongoDB running? Or is MONGO_URI in your .env pointing to Atlas?');
    console.error('   Current MONGO_URI:', process.env.MONGO_URI || 'NOT SET');
    console.error('   Error:', err.message);
    process.exit(1);
  }
  console.log('Connected to MongoDB');

  await Notification.deleteMany({});
  console.log('Cleared existing notifications');

  const now = new Date();
  const samples = [
    {
      studentID: 1042,
      type: 'Placement',
      message: 'CSX Corporation is hiring — Apply by May 10',
      isRead: false,
      rules: ['placement-priority', 'deadline-soon'],
      placement: { company: 'CSX Corporation', role: 'Software Engineer', deadline: new Date('2026-05-10') },
      createdAt: new Date(now - 1 * 60 * 60 * 1000),
    },
    {
      studentID: 1042,
      type: 'Event',
      message: 'Farewell party — Main Auditorium, 5PM',
      isRead: false,
      rules: [],
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
    },
    {
      studentID: 1042,
      type: 'Result',
      message: 'Mid-semester results published. Check portal.',
      isRead: true,
      rules: [],
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
    {
      studentID: 1042,
      type: 'Placement',
      message: 'Google Summer Internship — Applications open',
      isRead: false,
      rules: ['placement-priority'],
      placement: { company: 'Google', role: 'Intern', deadline: new Date('2026-05-30') },
      createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
    },
    {
      studentID: 9999,
      type: 'Event',
      message: 'Tech Fest 2026 — Register now',
      isRead: false,
      rules: [],
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
    },
  ];

  const inserted = await Notification.insertMany(samples);
  console.log(`✅ Seeded ${inserted.length} notifications`);

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
