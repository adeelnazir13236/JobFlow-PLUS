import { Router } from "express";
import {
  activeContractsReport,
  chartReport,
  contractPerformanceReport,
  contractRevenueReport,
  customerRevenueReport,
  customerSummaryReport,
  executiveDashboard,
  expiringContractsReport,
  invoiceReport,
  jobCompletionTrendReport,
  jobStatusReport,
  jobSummaryReport,
  outstandingBalanceReport,
  paymentReport,
  revenueReport,
  serviceRequestReport,
  technicianPerformanceReport,
  topCustomersReport
} from "../controllers/report.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import { requireFeature } from "../utils/features.js";

const router = Router();

router.use(authenticate);
router.use(requireFeature("REPORTS"));
router.use(authorize("SYSTEM_ADMIN", "ADMIN", "AGENT", "STAFF"));

router.get("/executive-dashboard", asyncHandler(executiveDashboard));
router.get("/charts", asyncHandler(chartReport));

router.get("/financial/revenue", asyncHandler(revenueReport));
router.get("/financial/invoices", asyncHandler(invoiceReport));
router.get("/financial/payments", asyncHandler(paymentReport));
router.get("/financial/outstanding-balances", asyncHandler(outstandingBalanceReport));

router.get("/contracts/active", asyncHandler(activeContractsReport));
router.get("/contracts/expiring", asyncHandler(expiringContractsReport));
router.get("/contracts/revenue", asyncHandler(contractRevenueReport));
router.get("/contracts/performance", asyncHandler(contractPerformanceReport));

router.get("/jobs/summary", asyncHandler(jobSummaryReport));
router.get("/jobs/status", asyncHandler(jobStatusReport));
router.get("/jobs/completion-trend", asyncHandler(jobCompletionTrendReport));
router.get("/jobs/technician-performance", asyncHandler(technicianPerformanceReport));

router.get("/customers/summary", asyncHandler(customerSummaryReport));
router.get("/customers/revenue", asyncHandler(customerRevenueReport));
router.get("/customers/top", asyncHandler(topCustomersReport));

router.get("/service-requests", asyncHandler(serviceRequestReport));

export default router;
