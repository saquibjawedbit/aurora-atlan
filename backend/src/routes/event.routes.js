import { Router } from "express";
import { getAllEvents, createEvent } from "../controllers/event.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/view", getAllEvents);
router.post("/create", authMiddleware(["ADMIN"]), createEvent);

export default router;
