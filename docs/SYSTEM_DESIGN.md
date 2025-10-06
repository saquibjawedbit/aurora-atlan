## Aurora-Atlan — System Design

This document describes the high-level architecture, key components, data flows, scalability considerations, failure modes, and security design for the Event Booking API (backend).

### Goals
- Prevent overselling of event tickets under high concurrent load
- Provide clear job status and visibility for queued booking requests
- Be resilient and observable in production environments
- Keep latency low for reads and ensure correctness for writes

### High-level Components

- API Server (Express + Node.js): Handles authentication, events, and booking endpoints.
- Queue (Redis + Bull or custom queue): Accepts booking requests and enforces FIFO processing.
- Worker(s): Background process(es) that process booking jobs sequentially or with controlled concurrency.
- Database (Postgres + Prisma): Stores Users, Events, Bookings, and related metadata. Transactions and row locks prevent oversells.
- Redis (cache + queue storage): Caches public reads (events list) and stores queue state and job metadata.

### Data Model (conceptual)

- User: id, name, email, passwordHash, role
- Event: id, name, venue, time, capacity, impressions, createdAt
- Booking: id, userId, eventId, createdAt

Note: See `prisma/schema.prisma` for the exact schema.

### Booking Workflow (User-facing)

1. Client calls POST /api/bookings/:eventId/book (authenticated)
2. API validates user and event existence, then enqueues a booking job to Redis with a generated jobId (UUID)
3. API responds immediately with jobId, queue position and status endpoint
4. Worker picks the next job and marks job state as processing
5. Worker starts a DB transaction and locks the event row (SELECT ... FOR UPDATE) or uses serializable isolation
6. Worker checks current bookings count < capacity
   - If available: create Booking, commit transaction, mark job completed
   - If full: rollback and mark job failed
7. Worker updates job status (completed/failed) and optional notifications to user

### Concurrency Controls

- Queueing ensures sequential ordering; one worker processes jobs for a particular event at a time when strict ordering is required.
- Database-level locking (row locks or serializable transaction isolation) ensures strong consistency.
- Retry logic with exponential backoff covers transient DB/Redis failures, with a limited retry count.

### Failure Modes and Mitigations

- Redis unavailable:
  - API should gracefully reject new bookings with a 503 or fall back to a degraded mode (not implemented by default).
  - Workers need reconnection backoff and alerting.
- Database deadlocks or timeouts:
  - Use short transaction timeouts and retry when safe.
- Stalled jobs:
  - Implement job heartbeat and detect stuck jobs. Move to failed state after threshold.
- Worker crash during processing:
  - Use a queue library (Bull, Bee-Queue) or custom job locking that detects stalled jobs and requeues or fails them for manual inspection. Ensure idempotency for job handlers so retries are safe.

### Observability

- Metrics: job queue length, job processing time, success/failure rates, DB transaction durations
- Logs: worker start/completion/failure with jobId and error stack traces
- Tracing: optional distributed tracing for API -> worker -> DB paths
- Alerts: Redis connection loss, elevated job failure rates, high queue latency

### Scaling

- Horizontal: run multiple workers but shard by eventId (hashing) or enforce a single-worker-per-event pattern to preserve ordering per event.
- Redis clustering for high availability and partition tolerance.
- Database: read replicas for analytics; primary for writes. Use connection pooling and prepared statements.

### Security

- JWT-based authentication for protected endpoints
- Input validation and sanitization on all API inputs
- Use parameterized queries and Prisma to avoid SQL injection
- Secure secrets via environment variables and a secret manager in production
- Least-privilege DB credentials and rotated keys

### API Summary (important endpoints)

- POST /api/bookings/:eventId/book — enqueue booking job
- GET /api/bookings/status/:jobId — job status and result
- GET /api/events/view — list events (cached)
- GET /api/events/:id/view — single event detail (increments impressions)
- Admin endpoints: /api/admin/queue/stats, /api/admin/queue/details, /api/admin/queue/pause, /api/admin/queue/resume, /api/admin/queue/clean

### Notes & Extensions

- Notifications: integrate email/SMS/webhooks to notify users on completion/failure
- Rate limiting: per-user and per-IP rate limiting for booking endpoint to reduce abusive loads
- Durable audit logs for bookings for compliance

---

Refer to `../backend/QUEUE_SYSTEM.md` for detailed queue behaviour and operational commands.

``` 