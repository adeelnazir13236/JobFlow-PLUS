import { Router } from "express";
import {
  editPayment,
  getPayment,
  listPayments,
  removePayment,
  storePayment
} from "../controllers/payment.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("PAYMENTS"));

router.get("/", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(listPayments));
router.get("/:id", authorize("ADMIN", "AGENT", "STAFF"), asyncHandler(getPayment));
router.post("/", authorize("ADMIN", "AGENT"), asyncHandler(storePayment));
router.put("/:id", authorize("ADMIN", "AGENT"), asyncHandler(editPayment));
router.delete("/:id", authorize("ADMIN", "AGENT"), asyncHandler(removePayment));

export default router;
