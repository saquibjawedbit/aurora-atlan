import express from "express";
import { 
  getAnalytics, 
  getQueueStatistics, 
  getQueueInfo, 
  clearQueue, 
  pauseBookingQueue, 
  resumeBookingQueue 
} from "../controllers/admin.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Only admin can access
router.get("/analytics", authMiddleware(["ADMIN"]), getAnalytics);

// Queue management endpoints
router.get("/queue/stats", authMiddleware(["ADMIN"]), getQueueStatistics);
router.get("/queue/details", authMiddleware(["ADMIN"]), getQueueInfo);
router.post("/queue/clean", authMiddleware(["ADMIN"]), clearQueue);
router.post("/queue/pause", authMiddleware(["ADMIN"]), pauseBookingQueue);
router.post("/queue/resume", authMiddleware(["ADMIN"]), resumeBookingQueue);

export default router;
