import {
  changePortalPassword,
  createPortalServiceRequest,
  getPortalContractById,
  getPortalContracts,
  getPortalDashboard,
  getPortalInvoiceById,
  getPortalInvoices,
  getPortalJobById,
  getPortalJobs,
  getPortalMe,
  getPortalPaymentById,
  getPortalPayments,
  getPortalQuotationById,
  getPortalQuotations,
  getPortalServiceRequestById,
  getPortalServiceRequests,
  loginPortalCustomer,
  setPortalQuotationStatus
} from "../services/portal.service.js";
import { generateInvoicePdf } from "../services/invoicePdf.service.js";
import { generatePaymentReceiptPdf } from "../services/paymentReceiptPdf.service.js";
import { generateQuotationPdf } from "../services/quotationPdf.service.js";
import { parseId } from "../utils/validation.js";

function portalUserAdapter(portalUser) {
  return {
    organizationId: portalUser.organizationId,
    organization: portalUser.organization
  };
}

function sendPdf(res, filename, buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(buffer);
}

export async function portalLogin(req, res) {
  const result = await loginPortalCustomer(req.body);
  res.json(result);
}

export async function portalLogout(_req, res) {
  res.status(204).send();
}

export async function portalMe(req, res) {
  res.json({ user: getPortalMe(req.portalUser) });
}

export async function portalChangePassword(req, res) {
  await changePortalPassword(req.portalUser, req.body);
  res.status(204).send();
}

export async function portalDashboard(req, res) {
  res.json({ dashboard: await getPortalDashboard(req.portalUser) });
}

export async function portalListQuotations(req, res) {
  res.json({ quotations: await getPortalQuotations(req.portalUser) });
}

export async function portalGetQuotation(req, res) {
  res.json({ quotation: await getPortalQuotationById(parseId(req.params.id, "Quotation ID"), req.portalUser) });
}

export async function portalApproveQuotation(req, res) {
  res.json({ quotation: await setPortalQuotationStatus(parseId(req.params.id, "Quotation ID"), "ACCEPTED", req.portalUser) });
}

export async function portalRejectQuotation(req, res) {
  res.json({ quotation: await setPortalQuotationStatus(parseId(req.params.id, "Quotation ID"), "REJECTED", req.portalUser) });
}

export async function portalQuotationPdf(req, res) {
  const id = parseId(req.params.id, "Quotation ID");
  await getPortalQuotationById(id, req.portalUser);
  sendPdf(res, `quotation-${id}.pdf`, await generateQuotationPdf(id, portalUserAdapter(req.portalUser)));
}

export async function portalListContracts(req, res) {
  res.json({ contracts: await getPortalContracts(req.portalUser) });
}

export async function portalGetContract(req, res) {
  res.json({ contract: await getPortalContractById(parseId(req.params.id, "Contract ID"), req.portalUser) });
}

export async function portalListJobs(req, res) {
  res.json({ jobs: await getPortalJobs(req.portalUser) });
}

export async function portalGetJob(req, res) {
  res.json({ job: await getPortalJobById(parseId(req.params.id, "Job ID"), req.portalUser) });
}

export async function portalListInvoices(req, res) {
  res.json({ invoices: await getPortalInvoices(req.portalUser) });
}

export async function portalGetInvoice(req, res) {
  res.json({ invoice: await getPortalInvoiceById(parseId(req.params.id, "Invoice ID"), req.portalUser) });
}

export async function portalInvoicePdf(req, res) {
  const id = parseId(req.params.id, "Invoice ID");
  await getPortalInvoiceById(id, req.portalUser);
  sendPdf(res, `invoice-${id}.pdf`, await generateInvoicePdf(id, portalUserAdapter(req.portalUser)));
}

export async function portalListPayments(req, res) {
  res.json({ payments: await getPortalPayments(req.portalUser) });
}

export async function portalGetPayment(req, res) {
  res.json({ payment: await getPortalPaymentById(parseId(req.params.id, "Payment ID"), req.portalUser) });
}

export async function portalPaymentReceipt(req, res) {
  const id = parseId(req.params.id, "Payment ID");
  await getPortalPaymentById(id, req.portalUser);
  sendPdf(res, `payment-receipt-${id}.pdf`, await generatePaymentReceiptPdf(id, portalUserAdapter(req.portalUser)));
}

export async function portalListServiceRequests(req, res) {
  res.json({ serviceRequests: await getPortalServiceRequests(req.portalUser) });
}

export async function portalGetServiceRequest(req, res) {
  res.json({ serviceRequest: await getPortalServiceRequestById(parseId(req.params.id, "Service request ID"), req.portalUser) });
}

export async function portalCreateServiceRequest(req, res) {
  res.status(201).json({ serviceRequest: await createPortalServiceRequest(req.body, req.portalUser) });
}
