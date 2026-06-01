import {
  createWhatsAppTemplate,
  getWhatsAppLogs,
  getWhatsAppSettings,
  getWhatsAppTemplates,
  saveWhatsAppSettings,
  sendContractNotification,
  sendInvoiceNotification,
  sendJobNotification,
  sendPaymentNotification,
  sendQuotationNotification,
  setWhatsAppSettingsActive,
  testWhatsAppConnection,
  updateWhatsAppTemplate
} from "../services/whatsapp.service.js";
import { parseId } from "../utils/validation.js";

export async function showSettings(req, res) {
  const settings = await getWhatsAppSettings(req.user, req.query);
  res.json({ settings });
}

export async function saveSettings(req, res) {
  const settings = await saveWhatsAppSettings(req.body, req.user);
  res.json({ settings });
}

export async function changeSettingsStatus(req, res) {
  const settings = await setWhatsAppSettingsActive(req.body, req.user);
  res.json({ settings });
}

export async function testConnection(req, res) {
  const result = await testWhatsAppConnection(req.body, req.user);
  res.json({ result });
}

export async function listTemplates(req, res) {
  const templates = await getWhatsAppTemplates(req.user, req.query);
  res.json({ templates });
}

export async function storeTemplate(req, res) {
  const template = await createWhatsAppTemplate(req.body, req.user);
  res.status(201).json({ template });
}

export async function editTemplate(req, res) {
  const template = await updateWhatsAppTemplate(parseId(req.params.id, "Template ID"), req.body, req.user);
  res.json({ template });
}

export async function listLogs(req, res) {
  const logs = await getWhatsAppLogs(req.user, req.query);
  res.json({ logs });
}

export async function sendQuotation(req, res) {
  const log = await sendQuotationNotification(parseId(req.params.id, "Quotation ID"), req.user);
  res.json({ log });
}

export async function sendInvoice(req, res) {
  const log = await sendInvoiceNotification(parseId(req.params.id, "Invoice ID"), req.user);
  res.json({ log });
}

export async function sendPayment(req, res) {
  const log = await sendPaymentNotification(parseId(req.params.id, "Payment ID"), req.user);
  res.json({ log });
}

export async function sendJob(req, res) {
  const log = await sendJobNotification(parseId(req.params.id, "Job ID"), req.user);
  res.json({ log });
}

export async function sendContract(req, res) {
  const log = await sendContractNotification(parseId(req.params.id, "Contract ID"), req.user);
  res.json({ log });
}
