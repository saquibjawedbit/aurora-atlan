import { PrismaClient } from "@prisma/client";
import { addBookingToQueue, getBookingStatus } from "../services/bookingQueue.js";

const prisma = new PrismaClient();

// Book an event using queue-based approach
export const bookEvent = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Quick validation before adding to queue
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, capacity: true },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Add booking request to queue
    const queueResult = await addBookingToQueue(userId, parseInt(id));
    
    res.status(202).json({
      message: "Booking request queued successfully",
      jobId: queueResult.jobId,
      queuePosition: queueResult.position,
      estimatedWaitTime: `${queueResult.estimatedWaitTime} seconds`,
      statusEndpoint: `/api/bookings/status/${queueResult.jobId}`,
    });
  } catch (err) {
    console.error("Error queuing booking:", err);
    res.status(500).json({ error: "Failed to queue booking request" });
  }
};

// Get booking status by job ID
export const getBookingStatusById = async (req, res) => {
  const { jobId } = req.params;

  try {
    const status = await getBookingStatus(jobId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({ error: "Booking job not found" });
    }

    res.json(status);
  } catch (err) {
    console.error("Error getting booking status:", err);
    res.status(500).json({ error: "Failed to get booking status" });
  }
};


// Cancel a booking
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

// Get booking history for the logged-in user
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
