import { Router } from "express";
import {
  callFollowUp,
  completeFollowUp,
  listPendingFollowUps
} from "../controllers/followUp.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get("/pending", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(listPendingFollowUps));
router.put("/:id/call", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(callFollowUp));
router.put("/:id/done", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(completeFollowUp));

export default router;
