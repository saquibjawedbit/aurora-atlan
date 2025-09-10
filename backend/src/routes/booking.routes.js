import { Router } from "express";
import { bookEvent, cancelBooking, getBookingHistory } from "../controllers/booking.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/:id/book", authMiddleware(["USER", "ADMIN"]), bookEvent);
router.delete("/:id/cancel", authMiddleware(["USER", "ADMIN"]), cancelBooking);
router.get("/history", authMiddleware(["USER", "ADMIN"]), getBookingHistory);

export default router;
