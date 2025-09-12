import { PrismaClient } from '@prisma/client';
import { bookingQueue } from '../services/bookingQueue.js';
import redis from '../configs/redis.js';

const prisma = new PrismaClient();

// Process booking jobs
bookingQueue.process('processBooking', 1, async (job) => {
  const { userId, eventId, jobId } = job.data;
  
  console.log(`Processing booking job ${jobId} for user ${userId}, event ${eventId}`);
  
  try {
    // Update job status to processing
    await redis.setex(`booking:${jobId}`, 300, JSON.stringify({
      status: 'processing',
      userId,
      eventId,
      timestamp: new Date().toISOString(),
    }));

    job.progress(10); // 10% progress

    // Use database-level locking to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Lock the event row for update to prevent concurrent modifications
      const event = await tx.event.findUnique({
        where: { id: parseInt(eventId) },
        include: { 
          bookings: {
            select: { id: true }
          }
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      job.progress(30); // 30% progress

      // Check if user already has a booking for this event
      const existingBooking = await tx.booking.findFirst({
        where: {
          userId: parseInt(userId),
          eventId: parseInt(eventId),
        },
      });

      if (existingBooking) {
        throw new Error('User already has a booking for this event');
      }

      job.progress(50); // 50% progress

      // Count current bookings
      const currentBookings = event.bookings.length;
      
      if (currentBookings >= event.capacity) {
        throw new Error('Event is fully booked');
      }

      job.progress(70); // 70% progress

      // Create the booking
      const booking = await tx.booking.create({
        data: {
          userId: parseInt(userId),
          eventId: parseInt(eventId),
        },
        include: {
          event: {
            select: {
              name: true,
              venue: true,
              time: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      job.progress(90); // 90% progress

      return booking;
    }, {
      isolationLevel: 'Serializable', // Highest isolation level to prevent phantom reads
      timeout: 10000, // 10 second timeout
    });

    job.progress(100); // 100% progress

    // Update Redis with successful result
    await redis.setex(`booking:${jobId}`, 300, JSON.stringify({
      status: 'completed',
      result: {
        bookingId: result.id,
        eventName: result.event.name,
        venue: result.event.venue,
        time: result.event.time,
      },
      userId,
      eventId,
      timestamp: new Date().toISOString(),
    }));

    console.log(`Successfully processed booking job ${jobId}`);
    return result;

  } catch (error) {
    console.error(`Error processing booking job ${jobId}:`, error.message);
    
    // Update Redis with error status
    await redis.setex(`booking:${jobId}`, 300, JSON.stringify({
      status: 'failed',
      error: error.message,
      userId,
      eventId,
      timestamp: new Date().toISOString(),
    }));

    throw error; // Re-throw to let Bull handle retries
  }
});

// Handle completed jobs
bookingQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully`);
});

// Handle failed jobs (after all retries exhausted)
bookingQueue.on('failed', async (job, err) => {
  console.log(`Job ${job.id} failed after all retries:`, err.message);
  
  const { jobId, userId, eventId } = job.data;
  
  // Update Redis with final failure status
  await redis.setex(`booking:${jobId}`, 300, JSON.stringify({
    status: 'failed',
    error: err.message,
    userId,
    eventId,
    timestamp: new Date().toISOString(),
    finalFailure: true,
  }));
});

// Handle stalled jobs
bookingQueue.on('stalled', (job) => {
  console.log(`Job ${job.id} stalled and will be retried`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down booking worker...');
  await bookingQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down booking worker...');
  await bookingQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('Booking worker started and waiting for jobs...');
