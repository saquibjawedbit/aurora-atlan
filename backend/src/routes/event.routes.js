import { Router } from "express";
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventById } from "../controllers/event.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/view", getAllEvents);
router.get("/:id/view", getEventById);
router.post("/create", authMiddleware(["ADMIN"]), createEvent);
router.put("/:id/update", authMiddleware(["ADMIN"]), updateEvent);
router.delete("/:id/delete", authMiddleware(["ADMIN"]), deleteEvent);

export default router;
