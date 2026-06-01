import { Router } from "express";
import {
  changeQuotationStatus,
  convertToContract,
  convertToJob,
  downloadQuotationPdf,
  editQuotation,
  editQuotationItem,
  getQuotation,
  listQuotations,
  removeQuotation,
  removeQuotationItem,
  storeQuotation,
  storeQuotationItem
} from "../controllers/quotation.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("QUOTATIONS"));

router.get("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(listQuotations));
router.get("/:id/pdf", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(downloadQuotationPdf));
router.get("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"), asyncHandler(getQuotation));
router.post("/", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(storeQuotation));
router.put("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(editQuotation));
router.put("/:id/status", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(changeQuotationStatus));
router.delete("/:id", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(removeQuotation));

router.post("/:id/items", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(storeQuotationItem));
router.put("/:id/items/:itemId", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(editQuotationItem));
router.delete("/:id/items/:itemId", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(removeQuotationItem));

router.post("/:id/convert-job", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(convertToJob));
router.post("/:id/convert-contract", authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(convertToContract));

export default router;
