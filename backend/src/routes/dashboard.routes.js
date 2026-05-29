import { Router } from "express";
import { showDashboard } from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(showDashboard));

export default router;
