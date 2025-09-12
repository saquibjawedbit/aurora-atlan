import { PrismaClient } from "@prisma/client";
import { getQueueStats, getQueueDetails, cleanQueue, pauseQueue, resumeQueue, getQueueHealth } from "../services/queueMonitor.js";

const prisma = new PrismaClient();

export const getAnalytics = async (req, res) => {
  try {
    // 1. Total bookings
    const totalBookings = await prisma.booking.count();

    // 2. Most popular events
    const popularEvents = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        impressions: true,
      },
      orderBy: { impressions: "desc" },
      take: 5,
    });


    // 3. Capacity utilization
    const events = await prisma.event.findMany({
      include: { _count: { select: { bookings: true } } },
    });

    const utilization = events.map(e => ({
      id: e.id,
      name: e.name,
      capacity: e.capacity,
      booked: e._count.bookings,
      utilization: ((e._count.bookings / e.capacity) * 100).toFixed(2) + "%",
    }));

    res.json({
      totalBookings,
      popularEvents,
      utilization,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Queue management endpoints
export const getQueueStatistics = async (req, res) => {
  try {
    const stats = await getQueueStats();
    const health = await getQueueHealth();
    
    res.json({
      stats,
      health,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getQueueInfo = async (req, res) => {
  try {
    const details = await getQueueDetails();
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const clearQueue = async (req, res) => {
  try {
    const result = await cleanQueue();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const pauseBookingQueue = async (req, res) => {
  try {
    const result = await pauseQueue();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resumeBookingQueue = async (req, res) => {
  try {
    const result = await resumeQueue();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
