import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const bookEvent = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: parseInt(id) },
        include: { bookings: true },
      });

      if (!event) throw new Error("Event not found");
      if (event.bookings.length >= event.capacity) throw new Error("Event full");

      return tx.booking.create({
        data: { userId, eventId: event.id },
      });
    });

    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  const { id } = req.params; 
  const userId = req.user.id;

  try {
    const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
    if (!booking || booking.userId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await prisma.booking.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Booking cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBookingHistory = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: { event: true },
    });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
