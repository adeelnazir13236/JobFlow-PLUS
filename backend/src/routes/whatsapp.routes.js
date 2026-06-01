import { Router } from "express";
import {
  changeSettingsStatus,
  editTemplate,
  listLogs,
  listTemplates,
  saveSettings,
  sendContract,
  sendInvoice,
  sendJob,
  sendPayment,
  sendQuotation,
  showSettings,
  storeTemplate,
  testConnection
} from "../controllers/whatsapp.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("WHATSAPP"));

router.get("/settings", authorize("SYSTEM_ADMIN", "ADMIN"), asyncHandler(showSettings));
router.put("/settings", authorize("SYSTEM_ADMIN", "ADMIN"), asyncHandler(saveSettings));
router.patch("/settings/status", authorize("SYSTEM_ADMIN", "ADMIN"), asyncHandler(changeSettingsStatus));
router.post("/settings/test", authorize("SYSTEM_ADMIN", "ADMIN"), asyncHandler(testConnection));

router.get("/templates", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(listTemplates));
router.post("/templates", authorize("SYSTEM_ADMIN", "ADMIN"), asyncHandler(storeTemplate));
router.put("/templates/:id", authorize("SYSTEM_ADMIN", "ADMIN"), asyncHandler(editTemplate));

router.get("/logs", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(listLogs));

router.post("/send/quotations/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(sendQuotation));
router.post("/send/invoices/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(sendInvoice));
router.post("/send/payments/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(sendPayment));
router.post("/send/jobs/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(sendJob));
router.post("/send/contracts/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(sendContract));

export default router;
