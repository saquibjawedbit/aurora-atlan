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
Public: Returns all events. When served from cache, shape may include `{ source: "cache", data: [...] }`.

Example
```
curl.exe http://localhost:3000/api/events/view
```

### GET /api/events/:id/view
Public: Returns a single event by ID and increments its `impressions` counter.

Example (view Event 1)
```
curl.exe http://localhost:3000/api/events/1/view
```

Response (200)
```
{
  "id": 1,
  "name": "Tech Meetup",
  "venue": "Main Hall",
  "time": "2025-09-30T17:00:00.000Z",
  "capacity": 100,
  "impressions": 1,
  ...
}
```

### Admin-only endpoints
By default, users register as `USER`. To create/update/delete events, set a user to `ADMIN` in the DB (e.g., via Prisma Studio):

```
npx prisma studio
```

Or run an update SQL in your DB client:
```
UPDATE "User" SET role = 'ADMIN' WHERE email = 'alice@example.com';
```

Include header for protected routes:
```
Authorization: Bearer <JWT>
```

### POST /api/events/create
Create a new event. Requires role: `ADMIN`.

Request body
```
{
  "name": "Tech Meetup",
  "venue": "Main Hall",
  "time": "2025-09-30T17:00:00.000Z",  // ISO8601 string
  "capacity": 100
}
```

Example
```
curl.exe -X POST http://localhost:3000/api/events/create -H "Content-Type: application/json" -H "Authorization: Bearer <JWT>" -d "{\"name\":\"Tech Meetup\",\"venue\":\"Main Hall\",\"time\":\"2025-09-30T17:00:00.000Z\",\"capacity\":100}"
```

Response (200)
```
{
  "id": 1,
  "name": "Tech Meetup",
  "venue": "Main Hall",
  "time": "2025-09-30T17:00:00.000Z",
  "capacity": 100,
  ...
}
```

### PUT /api/events/:id/update
Update an event. Requires role: `ADMIN`.

Example
```
curl.exe -X PUT http://localhost:3000/api/events/1/update -H "Content-Type: application/json" -H "Authorization: Bearer <JWT>" -d "{\"name\":\"Tech Meetup v2\",\"venue\":\"Auditorium\",\"time\":\"2025-10-01T17:00:00.000Z\",\"capacity\":120}"
```

### DELETE /api/events/:id/delete
Delete an event. Requires role: `ADMIN`.

Example
```
curl.exe -X DELETE http://localhost:3000/api/events/1/delete -H "Authorization: Bearer <JWT>"
```

---

## Bookings

All booking endpoints require auth (`USER` or `ADMIN`). Include:
```
Authorization: Bearer <JWT>
```

Important: the `:id` param means different things depending on the route:
- `POST /api/bookings/:id/book` — `:id` is the Event ID to book.
- `DELETE /api/bookings/:id/cancel` — `:id` is the Booking ID to cancel.

### POST /api/bookings/:id/book
Book an event by Event ID. Capacity is enforced transactionally.

Example (book Event 1)
```
curl.exe -X POST http://localhost:3000/api/bookings/1/book -H "Authorization: Bearer <JWT>"
```

Response (200)
```
{
  "id": 10,
  "userId": 1,
  "eventId": 1,
  "createdAt": "..."
}
```

### GET /api/bookings/history
Get the authenticated user's bookings (includes event details).

Example
```
curl.exe http://localhost:3000/api/bookings/history -H "Authorization: Bearer <JWT>"
```

Response (200)
```
[
  {
    "id": 10,
    "userId": 1,
    "eventId": 1,
    "createdAt": "...",
    "event": { "id": 1, "name": "Tech Meetup", ... }
  }
]
```

### DELETE /api/bookings/:id/cancel
Cancel a booking by Booking ID (only your own bookings can be cancelled).

Example (cancel Booking 10)
```
curl.exe -X DELETE http://localhost:3000/api/bookings/10/cancel -H "Authorization: Bearer <JWT>"
```

Response (200)
```
{ "message": "Booking cancelled" }
```

---

## Admin

Note: Admin routes require role `ADMIN` and should be mounted under `/api/admin`. If not already, add in `src/app.js`:
```
// app.use("/api/admin", adminRoutes)
```

Include header:
```
Authorization: Bearer <JWT>
```

### GET /api/admin/analytics
Returns platform-wide analytics.

Example
```
curl.exe http://localhost:3000/api/admin/analytics -H "Authorization: Bearer <JWT>"
```

Response (200)
```
{
  "totalBookings": 42,
  "popularEvents": [
    { "id": 1, "name": "Tech Meetup", "impressions": 120 },
    // ... up to 5
  ],
  "utilization": [
    { "id": 1, "name": "Tech Meetup", "capacity": 100, "booked": 80, "utilization": "80.00%" }
  ]
}
```

## Notes & error cases
- JWT header must be `Authorization: Bearer <JWT>`.
- Event caching: `GET /api/events/view` may return either a raw array or `{ source: "cache", data: [...] }` when served from Redis.
- Event impressions: hitting `GET /api/events/:id/view` increments `impressions` for that event.
- Booking capacity: attempting to book a full event returns `400 { "error": "Event full" }`.
- Cancel rules: you can only cancel your own booking; otherwise `403 { "error": "Not allowed" }`.
- Time field must be a valid ISO8601 date string; it is stored as a DateTime.

## Development tips
- Open Prisma Studio: `npx prisma studio` to inspect and edit data (e.g., set a user role to ADMIN).
- Logs: server logs appear in the terminal; Redis connection logs on startup.
