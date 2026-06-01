import {
  createBillingInvoice,
  generateDueBillingInvoices,
  getBillingInvoice,
  getBillingSummary,
  listBillingInvoices,
  recordBillingPayment,
  updateBillingInvoiceStatus
} from "../services/organizationBilling.service.js";
import { parseId } from "../utils/validation.js";

export async function billingSummary(_req, res) {
  res.json({ summary: await getBillingSummary() });
}

export async function billingInvoices(req, res) {
  res.json({ invoices: await listBillingInvoices(req.query) });
}

export async function billingInvoice(req, res) {
  res.json({ invoice: await getBillingInvoice(parseId(req.params.id, "Billing invoice ID")) });
}

export async function createInvoice(req, res) {
  res.status(201).json({ invoice: await createBillingInvoice(req.body) });
}

export async function generateInvoices(_req, res) {
  res.status(201).json({ invoices: await generateDueBillingInvoices() });
}

export async function changeInvoiceStatus(req, res) {
  res.json({ invoice: await updateBillingInvoiceStatus(parseId(req.params.id, "Billing invoice ID"), req.body.status) });
}

export async function recordPayment(req, res) {
  res.status(201).json({ invoice: await recordBillingPayment(parseId(req.params.id, "Billing invoice ID"), req.body) });
}
