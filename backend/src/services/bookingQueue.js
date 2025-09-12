import Queue from 'bull';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import redis from '../configs/redis.js';

dotenv.config();

// Create booking queue
export const bookingQueue = new Queue('booking queue', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs
    attempts: 3,          // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,        // Start with 2 second delay
    },
  },
});

// Add booking request to queue
export const addBookingToQueue = async (userId, eventId, userResponse) => {
  const jobId = uuidv4();
  
  const job = await bookingQueue.add('processBooking', {
    userId,
    eventId,
    jobId,
    timestamp: new Date().toISOString(),
  }, {
    jobId, // Use UUID as job ID for tracking
  });

  // Store job reference for user to track status
  await redis.setex(`booking:${jobId}`, 300, JSON.stringify({
    status: 'queued',
    userId,
    eventId,
    timestamp: new Date().toISOString(),
  }));

  return {
    jobId,
    position: await getQueuePosition(job),
    estimatedWaitTime: await getEstimatedWaitTime(),
  };
};

// Get queue position for a job
export const getQueuePosition = async (job) => {
  const waiting = await bookingQueue.getWaiting();
  const active = await bookingQueue.getActive();
  
  const position = waiting.findIndex(waitingJob => waitingJob.id === job.id);
  return position === -1 ? active.length : active.length + position + 1;
};

// Get estimated wait time based on queue length and processing rate
export const getEstimatedWaitTime = async () => {
  const waiting = await bookingQueue.getWaiting();
  const active = await bookingQueue.getActive();
  
  // Estimate 2 seconds per booking processing
  const totalJobs = waiting.length + active.length;
  return totalJobs * 2; // seconds
};

// Get booking status by job ID
export const getBookingStatus = async (jobId) => {
  // Check Redis for immediate status
  const redisStatus = await redis.get(`booking:${jobId}`);
  if (redisStatus) {
    return JSON.parse(redisStatus);
  }

  // Check job status in queue
  const job = await bookingQueue.getJob(jobId);
  if (!job) {
    return { status: 'not_found' };
  }

  let status = 'unknown';
  if (await job.isCompleted()) {
    status = 'completed';
  } else if (await job.isFailed()) {
    status = 'failed';
  } else if (await job.isActive()) {
    status = 'processing';
  } else if (await job.isWaiting()) {
    status = 'queued';
  }

  return {
    status,
    progress: job.progress(),
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
  };
};

// Clean up old job references
export const cleanupOldJobs = async () => {
  const keys = await redis.keys('booking:*');
  const now = new Date();
  
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const jobData = JSON.parse(data);
      const jobTime = new Date(jobData.timestamp);
      const diffMinutes = (now - jobTime) / (1000 * 60);
      
      // Remove jobs older than 10 minutes
      if (diffMinutes > 10) {
        await redis.del(key);
      }
    }
  }
};

// Setup cleanup interval (run every 5 minutes)
setInterval(cleanupOldJobs, 5 * 60 * 1000);

export default bookingQueue;
