import { Router } from "express";
import {
  changeServiceRequestStatus,
  convertServiceRequest,
  listServiceRequests,
  showServiceRequest
} from "../controllers/serviceRequest.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("CUSTOMER_PORTAL"));

router.get("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(listServiceRequests));
router.get("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(showServiceRequest));
router.patch("/:id/status", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(changeServiceRequestStatus));
router.post("/:id/convert-job", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(convertServiceRequest));

export default router;
