import { getInvoiceById, getInvoices } from "../services/contract.service.js";
import { generateInvoicePdf } from "../services/invoicePdf.service.js";
import { parseId } from "../utils/validation.js";

function sendPdf(res, filename, buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(buffer);
}

export async function listInvoices(req, res) {
  const invoices = await getInvoices(req.user);
  res.json({ invoices });
}

export async function getInvoice(req, res) {
  const invoice = await getInvoiceById(parseId(req.params.id, "Invoice ID"), req.user);
  res.json({ invoice });
}

export async function downloadInvoicePdf(req, res) {
  const id = parseId(req.params.id, "Invoice ID");
  const buffer = await generateInvoicePdf(id, req.user);
  sendPdf(res, `invoice-${id}.pdf`, buffer);
}
