import { bookingQueue } from './bookingQueue.js';

// Get queue statistics
export const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      bookingQueue.getWaiting(),
      bookingQueue.getActive(), 
      bookingQueue.getCompleted(),
      bookingQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    throw error;
  }
};

// Get detailed queue information
export const getQueueDetails = async () => {
  try {
    const [waiting, active] = await Promise.all([
      bookingQueue.getWaiting(),
      bookingQueue.getActive(),
    ]);

    const waitingJobs = waiting.map(job => ({
      id: job.id,
      data: job.data,
      timestamp: job.timestamp,
      attempts: job.attemptsMade,
    }));

    const activeJobs = active.map(job => ({
      id: job.id,
      data: job.data,
      timestamp: job.timestamp,
      progress: job.progress(),
    }));

    return {
      waiting: waitingJobs,
      active: activeJobs,
    };
  } catch (error) {
    console.error('Error getting queue details:', error);
    throw error;
  }
};

// Clear completed and failed jobs
export const cleanQueue = async () => {
  try {
    await bookingQueue.clean(0, 'completed');
    await bookingQueue.clean(0, 'failed');
    return { message: 'Queue cleaned successfully' };
  } catch (error) {
    console.error('Error cleaning queue:', error);
    throw error;
  }
};

// Pause/Resume queue
export const pauseQueue = async () => {
  await bookingQueue.pause();
  return { message: 'Queue paused' };
};

export const resumeQueue = async () => {
  await bookingQueue.resume();
  return { message: 'Queue resumed' };
};

// Get queue health
export const getQueueHealth = async () => {
  try {
    const isPaused = await bookingQueue.isPaused();
    const stats = await getQueueStats();
    
    // Check if there are stalled jobs (jobs that have been active for too long)
    const active = await bookingQueue.getActive();
    const stalledJobs = active.filter(job => {
      const now = Date.now();
      const jobStartTime = job.processedOn;
      const stalledThreshold = 30000; // 30 seconds
      return jobStartTime && (now - jobStartTime) > stalledThreshold;
    });

    return {
      status: isPaused ? 'paused' : 'running',
      stats,
      stalledJobs: stalledJobs.length,
      healthy: !isPaused && stalledJobs.length === 0,
    };
  } catch (error) {
    console.error('Error checking queue health:', error);
    return {
      status: 'error',
      healthy: false,
      error: error.message,
    };
  }
};
