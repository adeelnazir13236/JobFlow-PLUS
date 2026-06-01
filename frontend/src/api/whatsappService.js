import api from "./axios";

export async function getWhatsAppSettings(params = {}) {
  const { data } = await api.get("/whatsapp/settings", { params });
  return data.settings;
}

export async function saveWhatsAppSettings(payload) {
  const { data } = await api.put("/whatsapp/settings", payload);
  return data.settings;
}

export async function testWhatsAppConnection(payload = {}) {
  const { data } = await api.post("/whatsapp/settings/test", payload);
  return data.result;
}

export async function getWhatsAppTemplates(params = {}) {
  const { data } = await api.get("/whatsapp/templates", { params });
  return data.templates;
}

export async function createWhatsAppTemplate(payload) {
  const { data } = await api.post("/whatsapp/templates", payload);
  return data.template;
}

export async function updateWhatsAppTemplate(id, payload) {
  const { data } = await api.put(`/whatsapp/templates/${id}`, payload);
  return data.template;
}

export async function getWhatsAppLogs(params = {}) {
  const { data } = await api.get("/whatsapp/logs", { params });
  return data.logs;
}

export async function sendQuotationWhatsApp(id) {
  const { data } = await api.post(`/whatsapp/send/quotations/${id}`);
  return data.log;
}

export async function sendInvoiceWhatsApp(id) {
  const { data } = await api.post(`/whatsapp/send/invoices/${id}`);
  return data.log;
}

export async function sendPaymentWhatsApp(id) {
  const { data } = await api.post(`/whatsapp/send/payments/${id}`);
  return data.log;
}

export async function sendJobWhatsApp(id) {
  const { data } = await api.post(`/whatsapp/send/jobs/${id}`);
  return data.log;
}

export async function sendContractWhatsApp(id) {
  const { data } = await api.post(`/whatsapp/send/contracts/${id}`);
  return data.log;
}
