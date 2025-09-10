import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: { bookings: true },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
