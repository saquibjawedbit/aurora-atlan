# Queue-Based Ticket Booking System

This implementation provides a robust, queue-based ticket booking system that prevents overselling through proper concurrency controls and sequential processing.

## Architecture Overview

### Components

1. **Redis Queue**: Stores pending booking requests
2. **Booking Worker**: Processes requests sequentially 
3. **Database Transactions**: Ensures data consistency
4. **Status Tracking**: Real-time job status updates
5. **Admin Monitoring**: Queue management and statistics

### Key Features

- **No Overselling**: Database-level locking with serializable isolation
- **Fair Queuing**: First-come-first-served processing
- **Retry Logic**: Automatic retries with exponential backoff
- **Status Tracking**: Real-time job progress monitoring
- **Admin Controls**: Queue management and monitoring tools

## API Endpoints

### User Endpoints

#### Book an Event
```http
POST /api/bookings/:eventId/book
Authorization: Bearer <token>
```

Response:
```json
{
  "message": "Booking request queued successfully",
  "jobId": "uuid-here",
  "queuePosition": 3,
  "estimatedWaitTime": "6 seconds",
  "statusEndpoint": "/api/bookings/status/uuid-here"
}
```

#### Check Booking Status
```http
GET /api/bookings/status/:jobId
```

Responses:
- **Queued**: `{"status": "queued", "userId": 1, "eventId": 2}`
- **Processing**: `{"status": "processing", "progress": 50}`
- **Completed**: `{"status": "completed", "result": {...}}`
- **Failed**: `{"status": "failed", "error": "Event is fully booked"}`

### Admin Endpoints

#### Queue Statistics
```http
GET /api/admin/queue/stats
Authorization: Bearer <admin-token>
```

#### Queue Details
```http
GET /api/admin/queue/details  
Authorization: Bearer <admin-token>
```

#### Queue Management
```http
POST /api/admin/queue/pause
POST /api/admin/queue/resume  
POST /api/admin/queue/clean
Authorization: Bearer <admin-token>
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install bull uuid
```

### 2. Start Redis
```bash
redis-server
```

### 3. Start the Application
```bash
# Terminal 1: Start the main server
npm run dev

# Terminal 2: Start the booking worker
npm run worker:dev
```

### 4. Environment Variables
Ensure your `.env` file includes:
```
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
REDIS_URL="redis://localhost:6379"
```

## Database Considerations

### Concurrency Controls

The system uses several layers to prevent race conditions:

1. **Database Transactions**: All booking operations wrapped in transactions
2. **Serializable Isolation**: Highest isolation level to prevent phantom reads
3. **Row Locking**: Events are locked during booking checks
4. **Queue Processing**: Single worker ensures sequential processing

### Performance Optimizations

- Connection pooling for database
- Redis for fast job storage
- Efficient queue cleanup
- Limited job retention (50 completed, 100 failed)

## Monitoring and Troubleshooting

### Queue Health Monitoring

The system provides comprehensive monitoring:
- Active/waiting job counts
- Processing times and success rates  
- Stalled job detection
- Queue pause/resume capabilities

### Common Issues

1. **Stalled Jobs**: Jobs active for >30 seconds are flagged
2. **Memory Usage**: Old jobs are automatically cleaned up
3. **Redis Connection**: Health checks included
4. **Database Locks**: Timeout set to 10 seconds

### Logs

Worker logs include:
- Job processing start/completion
- Error details and retry attempts
- Performance metrics
- Queue status changes

## Testing the System

### Load Testing
```bash
# Simulate concurrent booking requests
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/bookings/1/book \
    -H "Authorization: Bearer <token>" &
done
```

### Status Monitoring
```bash
# Watch queue statistics
watch -n 1 'curl -s -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/admin/queue/stats | jq'
```

## Scalability Considerations

### Horizontal Scaling
- Multiple worker processes can be started
- Redis cluster for high availability
- Database read replicas for status checks

### Performance Tuning
- Adjust worker concurrency based on database capacity
- Configure Redis persistence settings
- Monitor queue processing rates

### Capacity Planning
- Average processing time: ~2 seconds per booking
- Recommended: 1 worker per 100 concurrent users
- Monitor queue depth and adjust accordingly

## Security Features

- JWT authentication for all booking endpoints
- Admin-only access to queue management
- Input validation and sanitization
- SQL injection prevention via Prisma

## Error Handling

The system includes comprehensive error handling:
- Automatic retries with exponential backoff
- Graceful degradation during high load
- Detailed error logging and reporting
- User-friendly error messages
