import { Router } from "express";
import {
  activate,
  cancel,
  complete,
  editBillingRule,
  editContract,
  editContractService,
  getContract,
  listContractInvoices,
  listContracts,
  pause,
  pauseContractService,
  removeContract,
  resumeContractService,
  storeBillingRule,
  storeContract,
  storeContractService
} from "../controllers/contract.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("CONTRACTS"));

router.get("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(listContracts));
router.get("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(getContract));
router.post("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(storeContract));
router.put("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(editContract));
router.put("/:id/activate", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("RECURRING_JOBS"), asyncHandler(activate));
router.put("/:id/pause", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(pause));
router.put("/:id/cancel", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(cancel));
router.put("/:id/complete", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(complete));
router.delete("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(removeContract));

router.post("/:id/services", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("RECURRING_JOBS"), asyncHandler(storeContractService));
router.put("/:id/services/:serviceId", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("RECURRING_JOBS"), asyncHandler(editContractService));
router.put("/:id/services/:serviceId/pause", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("RECURRING_JOBS"), asyncHandler(pauseContractService));
router.put("/:id/services/:serviceId/resume", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("RECURRING_JOBS"), asyncHandler(resumeContractService));

router.post("/:id/billing-rules", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("INVOICES"), asyncHandler(storeBillingRule));
router.put("/:id/billing-rules/:ruleId", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), requireFeature("INVOICES"), asyncHandler(editBillingRule));
router.get("/:id/invoices", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), requireFeature("INVOICES"), asyncHandler(listContractInvoices));

export default router;
