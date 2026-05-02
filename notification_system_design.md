# Notification System Design

## Stage 1 — REST API Design & JSON Schemas

### Overview

The Campus Notification System delivers targeted notifications to students across three categories:

| Type        | Description                                  |
|-------------|----------------------------------------------|
| `Placement` | Company hiring events, internship openings   |
| `Event`     | Campus events, fests, farewells              |
| `Result`    | Mid-sem, end-sem, and other academic results |

---

### REST API Endpoints

#### Create Notification
```
POST /api/notifications
```
**Request Body:**
```json
{
  "studentID": 1042,
  "type": "Placement",
  "message": "CSX Corporation is hiring — Apply by May 10",
  "rules": ["placement-priority", "deadline-soon"],
  "placement": {
    "company": "CSX Corporation",
    "role": "Software Engineer",
    "deadline": "2026-05-10T00:00:00.000Z"
  }
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664abc...",
    "studentID": 1042,
    "type": "Placement",
    "message": "CSX Corporation is hiring — Apply by May 10",
    "isRead": false,
    "rules": ["placement-priority", "deadline-soon"],
    "placement": { "company": "CSX Corporation", "role": "Software Engineer", "deadline": "2026-05-10T00:00:00.000Z" },
    "importanceScore": 140,
    "createdAt": "2026-05-02T05:00:00.000Z"
  }
}
```

#### Get Unread Notifications (Stage 3 optimised)
```
GET /api/notifications/unread?studentID=1042&days=7&types=Placement&limit=20
```
**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "664abc...",
      "studentID": 1042,
      "type": "Placement",
      "message": "CSX Corporation is hiring",
      "isRead": false,
      "importanceScore": 140,
      "createdAt": "2026-05-02T04:00:00.000Z"
    }
  ]
}
```

#### Priority Inbox (Stage 6)
```
GET /api/notifications/inbox?studentID=1042&limit=10
```
Returns top 10–15 notifications sorted by `importanceScore DESC, createdAt DESC`.

#### Mark as Read
```
PATCH /api/notifications/:id/read
```
**Request Body:** `{ "studentID": 1042 }`

#### Sync from Evaluation Service
```
POST /api/notifications/sync
```

#### Health Check
```
GET /health
```

---

## Stage 2 — Database Design (MongoDB / NoSQL)

### Why MongoDB?

| Factor            | Rationale                                                         |
|-------------------|-------------------------------------------------------------------|
| Schema flexibility| Notification types have varying fields (Placement has extra data) |
| Horizontal scale  | Sharding by `studentID` for 50,000-student scale                  |
| Rich querying     | Compound indexes suit the primary access patterns                 |
| TTL indexes       | Native support for auto-expiring old notifications                |

### Document Schema

```json
{
  "_id": "ObjectId",
  "studentID": "Number  — indexed",
  "type": "String  — enum: Placement | Event | Result",
  "message": "String  — max 500 chars",
  "isRead": "Boolean — default false",
  "rules": ["String — business rules applied"],
  "placement": {
    "company": "String",
    "role":    "String",
    "deadline":"Date"
  },
  "importanceScore": "Number — computed on save",
  "createdAt": "Date — auto, indexed",
  "updatedAt": "Date — auto"
}
```

### Indexes

```javascript
// Primary query: unread notifications for a student, newest first
db.notifications.createIndex({ studentID: 1, isRead: 1, createdAt: -1 });

// Type-filtered queries (e.g., Placement-only)
db.notifications.createIndex({ type: 1, createdAt: -1 });

// Priority inbox sort
db.notifications.createIndex({ studentID: 1, importanceScore: -1, createdAt: -1 });
```

---

## Stage 3 — Query Optimisation

### Problem Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Why It's Slow (Without Indexes)

1. **Full collection scan** — MongoDB scans every document without an index on `studentID`.
2. **In-memory sort** — Without a compound index covering `createdAt`, MongoDB loads all matches then sorts in memory — extremely expensive at scale.
3. **No field projection** — `SELECT *` fetches the entire document including large arrays/embedded objects.

### Optimised MongoDB Query

```javascript
// Uses compound index: { studentID: 1, isRead: 1, createdAt: -1 }
db.notifications.find(
  { studentID: 1042, isRead: false },
  { _id: 1, type: 1, message: 1, createdAt: 1, placement: 1 } // projection
)
.sort({ createdAt: -1 })
.limit(50)
.explain("executionStats"); // verify IXSCAN, not COLLSCAN
```

### Last 7 Days + Placement Only

```javascript
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

db.notifications.find({
  studentID: 1042,
  isRead: false,
  createdAt: { $gte: cutoff },
  type: { $in: ['Placement'] }
})
.sort({ createdAt: -1 });
```
> Uses index hint: `{ studentID: 1, isRead: 1, createdAt: -1 }` — MongoDB will apply the date range filter within the index scan.

### Schema Additions (Stage 3 requirement)

| Field           | Type     | Purpose                                                    |
|-----------------|----------|------------------------------------------------------------|
| `rules`         | String[] | Business rules applied (e.g. `placement-priority`)        |
| `placement`     | Object   | Company, role, deadline — only for Placement type         |
| `importanceScore` | Number | Pre-computed composite score for priority inbox            |

---

## Stage 4 — Caching Strategy

### Problem
Notifications are fetched on **every page load** → DB is overloaded with identical queries.

### Proposed Strategy: Cache-Aside with Redis

```
Client → API Server → [Redis Cache]
                              ↓ MISS
                         MongoDB
                              ↑ writes back to Redis
```

#### Implementation

```javascript
async function getUnreadNotifications(studentID, opts) {
  const cacheKey = `unread:${studentID}:${JSON.stringify(opts)}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Query DB
  const data = await repo.findUnreadByStudent(studentID, opts);

  // 3. Store in Redis with TTL
  await redis.setex(cacheKey, 60, JSON.stringify(data)); // 60s TTL

  return data;
}
```

#### Invalidation Strategy

| Event                        | Action                                      |
|------------------------------|---------------------------------------------|
| New notification created     | `DEL unread:{studentID}:*`, `DEL inbox:{studentID}:*` |
| Notification marked as read  | Same as above                               |
| TTL expiry (60s)             | Automatic — no code needed                  |

### Tradeoffs

| Tradeoff         | Cache-Aside with Redis                              |
|------------------|-----------------------------------------------------|
| ✅ Performance   | 95%+ cache hit rate for repeat page loads           |
| ✅ Scalability   | Redis handles millions of ops/sec                   |
| ⚠️ Stale data   | Student may see up to 60s stale notifications       |
| ⚠️ Complexity   | Invalidation logic must be maintained carefully     |
| ⚠️ Cold start   | First hit after expiry goes to DB                   |

**Recommended TTL:** 30–60 seconds for most students. Reduce to 10s for students actively browsing.

---

## Stage 5 — Scalable Bulk Notification System

### Problem with the Given Code

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # synchronous, sequential
        save_to_db(student_id, message)   # synchronous, sequential
        push_to_app(student_id, message)  # synchronous, sequential
```

### Failure Points

| Issue                  | Impact                                                      |
|------------------------|-------------------------------------------------------------|
| Sequential processing  | 50,000 students × ~100ms/op = **1.4+ hours** per broadcast |
| Single point of failure| One email failure blocks all subsequent students            |
| No retry logic         | Failed deliveries are silently lost                         |
| No backpressure        | Email provider rate limits will cause mass failures         |
| Memory exhaustion      | Loading 50,000 IDs into one array can crash the process     |

### Redesigned Architecture

```
Admin triggers broadcast
         │
         ▼
  Message Queue (e.g., BullMQ / RabbitMQ)
  ┌─────────────────────────────────┐
  │  batch_notify_job               │
  │  { studentIDs: [chunk of 500] } │
  └─────────────────────────────────┘
         │
    Worker Pool (N workers)
    ├── Worker 1: bulk insert to DB → emit push notification
    ├── Worker 2: batch email via SendGrid (500/request)
    └── Worker 3: retry queue for failures
```

#### Pseudocode (Node.js / BullMQ)

```javascript
// Publisher — splits 50k IDs into batches
async function broadcastAll(studentIDs, message) {
  const BATCH_SIZE = 500;
  for (let i = 0; i < studentIDs.length; i += BATCH_SIZE) {
    const batch = studentIDs.slice(i, i + BATCH_SIZE);
    await notifyQueue.add('batch_notify', { studentIDs: batch, message });
  }
}

// Consumer — processes each batch
notifyQueue.process('batch_notify', async (job) => {
  const { studentIDs, message } = job.data;

  // 1. Bulk DB insert (one query, not N)
  await Notification.insertMany(
    studentIDs.map((id) => ({ studentID: id, type: 'Event', message }))
  );

  // 2. Batch email (SendGrid handles 1000/call)
  await sendBatchEmail(studentIDs, message);

  // 3. Push notifications (FCM supports 500/call)
  await sendBatchPush(studentIDs, message);
});
```

#### Key Improvements

| Feature           | Naive Code | Redesigned              |
|-------------------|------------|-------------------------|
| Processing time   | 1.4+ hours | ~2–3 minutes            |
| Failure isolation | Whole loop fails | Per-batch retries |
| Email delivery    | One-by-one | Batch API (1000/call)   |
| DB writes         | N inserts  | 1 bulkWrite per batch   |
| Scalability       | Single process | Horizontally scalable workers |
| Observability     | None       | Job logs, retry counts, dead-letter queue |

---

## Stage 6 — Priority Inbox System

### Requirement
Show top 10–15 notifications per student, ranked by relevance.

### Scoring Formula

```
importanceScore = TYPE_WEIGHT + RECENCY_BONUS + UNREAD_BONUS
```

| Component       | Value                                     |
|-----------------|-------------------------------------------|
| Placement type  | 100 points                                |
| Event type      | 50 points                                 |
| Result type     | 30 points                                 |
| Recency bonus   | max(0, 30 − days_since_created)           |
| Unread bonus    | +10 if isRead = false                     |

**Examples:**

| Scenario                              | Score       |
|---------------------------------------|-------------|
| New Placement, 0 days old, unread     | 100+30+10=140 |
| Placement, 5 days old, unread         | 100+25+10=135 |
| Event, 1 day old, unread              | 50+29+10=89  |
| Result, 10 days old, read             | 30+20+0=50   |

### API

```
GET /api/notifications/inbox?studentID=1042&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "...",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "importanceScore": 140,
      "isRead": false,
      "createdAt": "2026-05-02T04:00:00.000Z"
    }
  ]
}
```

### Query
```javascript
// Uses index: { studentID: 1, importanceScore: -1, createdAt: -1 }
db.notifications.find({ studentID: 1042 })
  .sort({ importanceScore: -1, createdAt: -1 })
  .limit(10);
```

> Score is pre-computed on `pre('save')` hook — no runtime computation per request.

---

*Design document covers all 6 stages of the Campus Notification System.*
