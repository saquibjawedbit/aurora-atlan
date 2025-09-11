import { PrismaClient } from "@prisma/client";
import redis from "../configs/redis.js";

const prisma = new PrismaClient();

// Get all events with caching
export const getAllEvents = async (req, res) => {
  try {

    const cached = await redis.get("events:all");
    if (cached) {
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    const events = await prisma.event.findMany({
      include: { bookings: true },
    });

    await redis.setex("events:all", 60, JSON.stringify(events)); // 60 seconds
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new event
export const createEvent = async (req, res) => {
  const { name, venue, time, capacity } = req.body;
  try {
    const event = await prisma.event.create({
      data: { name, venue, time: new Date(time), capacity },
    });
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update an existing event
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, venue, time, capacity } = req.body;

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        name,
        venue,
        time: new Date(time),
        capacity,
      },
    });

    await redis.del("events:all");

    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.event.delete({
      where: { id: Number(id) },
    });

    await redis.del("events:all");

    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
