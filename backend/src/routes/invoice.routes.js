import { Router } from "express";
import { getInvoice, listInvoices } from "../controllers/invoice.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("INVOICES"));

router.get("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(listInvoices));
router.get("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(getInvoice));

export default router;
