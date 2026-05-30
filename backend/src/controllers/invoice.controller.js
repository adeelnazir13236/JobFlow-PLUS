import { getInvoiceById, getInvoices } from "../services/contract.service.js";
import { parseId } from "../utils/validation.js";

export async function listInvoices(req, res) {
  const invoices = await getInvoices(req.user);
  res.json({ invoices });
}

export async function getInvoice(req, res) {
  const invoice = await getInvoiceById(parseId(req.params.id, "Invoice ID"), req.user);
  res.json({ invoice });
}
