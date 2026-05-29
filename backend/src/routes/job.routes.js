import { Router } from "express";
import {
  editJob,
  getJob,
  listCalendarJobs,
  listJobs,
  markJobComplete,
  storeJob
} from "../controllers/job.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(listJobs));
router.get("/calendar", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(listCalendarJobs));
router.get("/:id", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(getJob));
router.post("/", authorize("ADMIN", "AGENT"), asyncHandler(storeJob));
router.put("/:id", authorize("ADMIN", "AGENT"), asyncHandler(editJob));
router.put("/:id/complete", authorize("ADMIN", "STAFF"), asyncHandler(markJobComplete));

export default router;
