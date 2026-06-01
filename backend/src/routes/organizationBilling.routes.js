import { Router } from "express";
import {
  billingInvoice,
  billingInvoices,
  billingSummary,
  changeInvoiceStatus,
  createInvoice,
  generateInvoices,
  recordPayment
} from "../controllers/organizationBilling.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.get("/summary", asyncHandler(billingSummary));
router.get("/invoices", asyncHandler(billingInvoices));
router.post("/invoices", asyncHandler(createInvoice));
router.post("/invoices/generate-due", asyncHandler(generateInvoices));
router.get("/invoices/:id", asyncHandler(billingInvoice));
router.patch("/invoices/:id/status", asyncHandler(changeInvoiceStatus));
router.post("/invoices/:id/payments", asyncHandler(recordPayment));

export default router;
