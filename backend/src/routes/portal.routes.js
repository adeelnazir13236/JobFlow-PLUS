import { Router } from "express";
import {
  portalApproveQuotation,
  portalChangePassword,
  portalCreateServiceRequest,
  portalDashboard,
  portalGetContract,
  portalGetInvoice,
  portalGetJob,
  portalGetPayment,
  portalGetQuotation,
  portalGetServiceRequest,
  portalInvoicePdf,
  portalListContracts,
  portalListInvoices,
  portalListJobs,
  portalListPayments,
  portalListQuotations,
  portalListServiceRequests,
  portalLogin,
  portalLogout,
  portalMe,
  portalPaymentReceipt,
  portalQuotationPdf,
  portalRejectQuotation
} from "../controllers/portal.controller.js";
import { authenticatePortal } from "../middleware/portalAuth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.post("/auth/login", asyncHandler(portalLogin));
router.post("/auth/logout", asyncHandler(portalLogout));

router.use(authenticatePortal);

router.get("/auth/me", asyncHandler(portalMe));
router.patch("/auth/password", asyncHandler(portalChangePassword));
router.get("/dashboard", asyncHandler(portalDashboard));

router.get("/quotations", asyncHandler(portalListQuotations));
router.get("/quotations/:id/pdf", asyncHandler(portalQuotationPdf));
router.get("/quotations/:id", asyncHandler(portalGetQuotation));
router.put("/quotations/:id/approve", asyncHandler(portalApproveQuotation));
router.put("/quotations/:id/reject", asyncHandler(portalRejectQuotation));

router.get("/contracts", asyncHandler(portalListContracts));
router.get("/contracts/:id", asyncHandler(portalGetContract));

router.get("/jobs", asyncHandler(portalListJobs));
router.get("/jobs/:id", asyncHandler(portalGetJob));

router.get("/invoices", asyncHandler(portalListInvoices));
router.get("/invoices/:id/pdf", asyncHandler(portalInvoicePdf));
router.get("/invoices/:id", asyncHandler(portalGetInvoice));

router.get("/payments", asyncHandler(portalListPayments));
router.get("/payments/:id/receipt", asyncHandler(portalPaymentReceipt));
router.get("/payments/:id", asyncHandler(portalGetPayment));

router.get("/service-requests", asyncHandler(portalListServiceRequests));
router.post("/service-requests", asyncHandler(portalCreateServiceRequest));
router.get("/service-requests/:id", asyncHandler(portalGetServiceRequest));

export default router;
