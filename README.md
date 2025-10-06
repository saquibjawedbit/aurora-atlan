# Event Booking API (Backend)

A simple Node.js + Express + Prisma API for user auth, events, and bookings with Redis caching.

Base URL: `http://localhost:3000`

## Quick start

1) Prerequisites
- Node.js 18+
- PostgreSQL running and a database created
- Redis running on `127.0.0.1:6379`

2) Configure environment
Create `./.env` in `backend/`:

```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<db>?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
PORT=3000
```

Note: Redis host/port are configured in `src/configs/redis.js` (defaults to `127.0.0.1:6379`).

3) Install and run migrations
- Install deps: `npm install`
- Generate Prisma client and run migrations: `npx prisma migrate dev`
- Start dev server: `npm run dev`

Server will start on `http://localhost:3000`.

---

## Auth

### POST /api/auth/register
Registers a new user (role defaults to USER).

Request body
```
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "Password123!"
}
```

Response (200)
```
{
  "user": { "id": 1, "email": "alice@example.com", "name": "Alice", "role": "USER", ... },
  "token": "<JWT>"
}
```

Example (Windows PowerShell using curl.exe)
```
curl.exe -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Alice\",\"email\":\"alice@example.com\",\"password\":\"Password123!\"}"
```

### POST /api/auth/login
Logs in an existing user.

Request body
```
{
  "email": "alice@example.com",
  "password": "Password123!"
}
```

Response (200)
```
{
  "user": { "id": 1, "email": "alice@example.com", "name": "Alice", "role": "USER", ... },
  "token": "<JWT>"
}
```

Example
```
curl.exe -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"alice@example.com\",\"password\":\"Password123!\"}"
```

Save the token from the response and use it as `Authorization: Bearer <JWT>` in protected endpoints.

---

## Events

### GET /api/events/view
# Aurora-Atlan — Event Booking API (Backend)

Beautiful, resilient, queue-based ticket booking backend built with Node.js, Express, Prisma and Redis.

This repository contains the backend for the Event Booking API used in demos and small production deployments.

Site: http://localhost:3000 (default)

## Quick Start (development)

Prerequisites

- Node.js 18+
- PostgreSQL running and a database created
- Redis running on `127.0.0.1:6379`

Prepare env and install

```bash
cd backend
cp .env.example .env   # or create .env manually
npm install
```

Run migrations and start services

```bash
npx prisma migrate dev   # generate client and apply migrations
npm run dev              # start API server (development)
# in a second terminal: npm run worker:dev  # start booking worker
```

Environment variables (put in `backend/.env`)

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<db>?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
PORT=3000
REDIS_URL="redis://127.0.0.1:6379"
```

If you don't have Redis locally, start one quickly with `redis-server`.

## Architecture Overview

This backend uses a queue-based booking flow to prevent overselling. Key components:

- API server (Express)
- Redis-backed queue (Bull or equivalent)
- Worker(s) that process booking jobs sequentially
- Postgres (Prisma) for persistent storage

Detailed system design: see `docs/SYSTEM_DESIGN.md`.
Queue operational notes: `backend/QUEUE_SYSTEM.md`.

## Important Endpoints

- POST /api/auth/register — register a user
- POST /api/auth/login — login (returns JWT)
- GET /api/events/view — list events (cached)
- GET /api/events/:id/view — view single event (increments impressions)
- POST /api/bookings/:eventId/book — enqueue a booking job (authenticated)
- GET /api/bookings/status/:jobId — check job status
- /api/admin/** — admin-only queue and analytics endpoints

Use `Authorization: Bearer <JWT>` for protected routes.

## Running the worker

The worker processes booking jobs and must run separately from the API server. Development script:

```bash
cd backend
npm run worker:dev
```

## Testing & Load Simulation

Simulate concurrent booking requests (simple):

```bash
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/bookings/1/book -H "Authorization: Bearer <JWT>" &
done
```

## Admin / Monitoring

Admin routes for queue stats and control:

- GET /api/admin/queue/stats
- GET /api/admin/queue/details
- POST /api/admin/queue/pause
- POST /api/admin/queue/resume
- POST /api/admin/queue/clean

These require an ADMIN user. To set a user as ADMIN, use Prisma Studio:

```bash
npx prisma studio
```

or update via SQL:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'alice@example.com';
```

## Troubleshooting

- Redis connection issues: ensure `REDIS_URL` matches your Redis server and that Redis is running.
- Migrations fail: check `DATABASE_URL` and that the DB user has the necessary privileges.
- Jobs stalled: inspect worker logs and Redis; see `backend/QUEUE_SYSTEM.md` for operational guidance.

## Contributing

PRs and issues welcome. If you change public behavior, add or update tests and documentation.

## Files & docs

- `backend/` — main backend code (Express app, workers, configs)
- `backend/QUEUE_SYSTEM.md` — queue-specific operational runbook
- `docs/SYSTEM_DESIGN.md` — high-level system design and considerations (new)

---

If you'd like, I can also:

- Add sample Postman collection or curl examples for each endpoint
- Add a Makefile or npm scripts to simplify running the server + worker
- Add a small Postman/Newman test suite

Summary: created `docs/SYSTEM_DESIGN.md` and updated this README to include quickstart, commands, and links to documentation.
