import express from "express";
import { getAnalytics } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// Only admin can access
router.get("/analytics", authMiddleware(["admin"]), getAnalytics);

export default router;
