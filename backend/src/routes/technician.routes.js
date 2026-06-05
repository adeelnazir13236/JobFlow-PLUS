import { Router } from "express";
import {
  addNote,
  checkInJob,
  checkOutJob,
  captureSignature,
  completeJob,
  dashboard,
  editNote,
  jobs,
  pauseJob,
  profile,
  resumeJob,
  showJob,
  startJob,
  updateChecklist,
  uploadAttachment
} from "../controllers/technician.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("TECHNICIAN_WORKSPACE"));
router.use(authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"));

router.get("/dashboard", asyncHandler(dashboard));
router.get("/jobs", asyncHandler(jobs));
router.get("/profile", asyncHandler(profile));
router.get("/jobs/:id", asyncHandler(showJob));
router.post("/jobs/:id/start", asyncHandler(startJob));
router.post("/jobs/:id/pause", asyncHandler(pauseJob));
router.post("/jobs/:id/resume", asyncHandler(resumeJob));
router.post("/jobs/:id/complete", asyncHandler(completeJob));
router.post("/jobs/:id/check-in", requireFeature("GPS_TRACKING"), asyncHandler(checkInJob));
router.post("/jobs/:id/check-out", requireFeature("GPS_TRACKING"), asyncHandler(checkOutJob));
router.post("/jobs/:id/notes", asyncHandler(addNote));
router.put("/jobs/:id/notes/:noteId", asyncHandler(editNote));
router.post("/jobs/:id/attachments", asyncHandler(uploadAttachment));
router.post("/jobs/:id/signatures", asyncHandler(captureSignature));
router.patch("/jobs/:id/checklist/:itemId", asyncHandler(updateChecklist));

export default router;
