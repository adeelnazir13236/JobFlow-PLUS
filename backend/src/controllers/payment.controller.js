import {
  createPayment,
  deletePayment,
  getPaymentById,
  getPayments,
  updatePayment
} from "../services/payment.service.js";
import { generatePaymentReceiptPdf } from "../services/paymentReceiptPdf.service.js";
import { parseId } from "../utils/validation.js";

function sendPdf(res, filename, buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(buffer);
}

export async function listPayments(req, res) {
  const payments = await getPayments(req.user, req.query);
  res.json({ payments });
}

export async function getPayment(req, res) {
  const payment = await getPaymentById(parseId(req.params.id, "Payment ID"), req.user);
  res.json({ payment });
}

export async function downloadPaymentReceipt(req, res) {
  const id = parseId(req.params.id, "Payment ID");
  const buffer = await generatePaymentReceiptPdf(id, req.user);
  sendPdf(res, `payment-receipt-${id}.pdf`, buffer);
}

export async function storePayment(req, res) {
  const payment = await createPayment(req.body, req.user);
  res.status(201).json({ payment });
}

export async function editPayment(req, res) {
  const payment = await updatePayment(parseId(req.params.id, "Payment ID"), req.body, req.user);
  res.json({ payment });
}

export async function removePayment(req, res) {
  await deletePayment(parseId(req.params.id, "Payment ID"), req.user);
  res.status(204).send();
}
