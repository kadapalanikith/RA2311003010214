# Campus Backend — Vehicle Scheduler & Notification System

A production-grade Node.js backend implementing:
- **Vehicle Maintenance Scheduler** — 0/1 Knapsack DP to maximise impact within mechanic hours
- **Campus Notification System** — Full 6-stage microservice with MongoDB, caching, and priority inbox
- **Logging Middleware** — Async, non-blocking remote logging via the evaluation-service

---

## Repository Structure

```
.
├── logging_middleware/               # Shared async logging module
│   ├── config/
│   │   ├── auth.js                   # Token config (reads from env)
│   │   └── constants.js              # Valid stacks, levels, packages
│   ├── middleware/
│   │   └── requestLogger.js          # Express HTTP request/response logger
│   ├── transport/
│   │   └── httpSender.js             # Zero-dependency HTTP POST to Log API
│   ├── utils/
│   │   ├── consoleEmitter.js         # Coloured console output
│   │   └── validator.js              # Payload validation
│   ├── test/
│   │   └── logger.test.js            # Built-in Node test suite
│   ├── logger.js                     # Core Log() function
│   ├── index.js
│   └── package.json
│
├── vehicle_maintenance_scheduler/    # Knapsack microservice (port 3001)
│   ├── src/
│   │   ├── algorithms/
│   │   │   └── knapsack.js           # O(n×W) 0/1 DP solver
│   │   ├── api/
│   │   │   └── evalClient.js         # Depot + vehicle task fetcher
│   │   ├── controller/
│   │   │   └── schedulerController.js
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   ├── route/
│   │   │   └── schedulerRoutes.js
│   │   └── service/
│   │       └── schedulerService.js
│   ├── test/
│   │   └── knapsack.test.js
│   ├── app.js
│   ├── .env.example
│   └── package.json
│
├── notification_app_be/              # Notification microservice (port 3002)
│   ├── scripts/
│   │   └── seed.js
│   ├── src/
│   │   ├── api/
│   │   │   └── evalClient.js
│   │   ├── cache/
│   │   │   └── notificationCache.js  # In-process TTL cache (Redis-ready)
│   │   ├── controller/
│   │   │   └── notificationController.js
│   │   ├── domain/
│   │   │   └── Notification.js       # Mongoose schema + indexes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── validators.js
│   │   ├── repository/
│   │   │   └── notificationRepository.js
│   │   ├── route/
│   │   │   └── notificationRoutes.js
│   │   └── service/
│   │       └── notificationService.js
│   ├── app.js
│   ├── .env.example
│   └── package.json
│
├── notification_system_design.md     # 6-stage system design document
├── README.md
├── deployment.md
└── .gitignore
```

---

## Quick Start

### Prerequisites

- Node.js >= 16
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/<roll-number>.git
cd <roll-number>

# Install each service
cd logging_middleware && npm install && cd ..
cd vehicle_maintenance_scheduler && npm install && cd ..
cd notification_app_be && npm install && cd ..
```

### 2. Configure Environment

```bash
# Vehicle Maintenance Scheduler
cp vehicle_maintenance_scheduler/.env.example vehicle_maintenance_scheduler/.env

# Notification Backend
cp notification_app_be/.env.example notification_app_be/.env
```

Edit each `.env` and set:

```
EVAL_ACCESS_TOKEN=<your_bearer_token>
MONGO_URI=<your_mongodb_connection_string>
```

### 3. Run Services

```bash
# Vehicle Maintenance Scheduler (port 3001)
cd vehicle_maintenance_scheduler
npm start

# Notification Backend (port 3002)
cd notification_app_be
npm start
```

### 4. Seed Database (optional)

```bash
cd notification_app_be
npm run seed
```

---

## Environment Variables

### `vehicle_maintenance_scheduler/.env`

| Variable           | Description                           | Default                              |
|--------------------|---------------------------------------|--------------------------------------|
| `PORT`             | Server port                           | `3001`                               |
| `NODE_ENV`         | Runtime environment                   | `development`                        |
| `EVAL_BASE_URL`    | Evaluation service base URL           | `http://20.207.122.201/evaluation-service` |
| `EVAL_ACCESS_TOKEN`| Bearer token from /auth endpoint      | —                                    |

### `notification_app_be/.env`

| Variable           | Description                           | Default                              |
|--------------------|---------------------------------------|--------------------------------------|
| `PORT`             | Server port                           | `3002`                               |
| `MONGO_URI`        | MongoDB connection string             | `mongodb://localhost:27017/campus_notifications` |
| `EVAL_ACCESS_TOKEN`| Bearer token from /auth endpoint      | —                                    |
| `CACHE_TTL_SECONDS`| Notification cache TTL                | `60`                                 |

---

## API Reference

### Vehicle Maintenance Scheduler (port 3001)

| Method | Endpoint              | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/health`             | Service health check                 |
| GET    | `/schedule`           | Optimal schedule for all depots      |
| GET    | `/schedule/:depotId`  | Optimal schedule for one depot       |

**Sample Response — GET /schedule/1:**
```json
{
  "success": true,
  "data": {
    "depotID": 1,
    "mechanicHours": 60,
    "scheduledTasks": [
      { "taskID": "abc123", "duration": 5, "impact": 7 }
    ],
    "totalDuration": 58,
    "totalImpact": 312,
    "utilizationPercent": "96.7"
  }
}
```

---

### Notification Backend (port 3002)

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/health`                         | Service health check                 |
| POST   | `/api/notifications`              | Create a notification                |
| GET    | `/api/notifications/unread`       | Get unread notifications (Stage 3)   |
| GET    | `/api/notifications/inbox`        | Priority inbox top 10–15 (Stage 6)   |
| PATCH  | `/api/notifications/:id/read`     | Mark as read                         |
| POST   | `/api/notifications/sync`         | Sync from evaluation-service         |

---

## Running Tests

```bash
# Logging middleware tests
cd logging_middleware
npm test

# Knapsack algorithm tests
cd vehicle_maintenance_scheduler
npm test
```

---

## Design Highlights

### Logging Middleware
- **Zero external dependencies** — pure Node.js built-in `http`/`https`
- **Non-blocking** — uses `setImmediate` so log delivery never stalls request handling
- **Strict validation** — validates stack, level, and package against evaluation-service spec before any I/O

### Vehicle Maintenance Scheduler
- **Algorithm:** Bottom-up 0/1 Knapsack DP — `O(n × W)` time, correct and optimal
- **No greedy shortcuts** — greedy (ratio-based) is provably suboptimal for 0/1 knapsack

### Notification System
- **Pre-computed `importanceScore`** — calculated on `pre('save')` hook, not at query time
- **Compound indexes** — designed to exactly cover the Stage 3 slow query
- **Cache-aside pattern** — invalidated on write, TTL fallback for safety
- **Bulk notification** — batch-based queue design described in Stage 5
