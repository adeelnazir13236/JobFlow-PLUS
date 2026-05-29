import { Router } from "express";
import {
  editCallLog,
  getCallLog,
  listCallLogs,
  storeCallLog
} from "../controllers/callLog.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(listCallLogs));
router.get("/:id", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(getCallLog));
router.post("/", authorize("ADMIN", "AGENT"), asyncHandler(storeCallLog));
router.put("/:id", authorize("ADMIN", "AGENT"), asyncHandler(editCallLog));

export default router;
