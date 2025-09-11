import { Router } from "express";
import { getAllEvents, createEvent, updateEvent, deleteEvent } from "../controllers/event.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/view", getAllEvents);
router.post("/create", authMiddleware(["ADMIN"]), createEvent);
router.put("/:id", authMiddleware(["ADMIN"]), updateEvent);
router.delete("/:id", authMiddleware(["ADMIN"]), deleteEvent);

export default router;
