import { Router } from "express";
import { showDashboard } from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { requireFeature } from "../utils/features.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), requireFeature("DASHBOARD"), asyncHandler(showDashboard));

export default router;
