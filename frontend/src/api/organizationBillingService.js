import api from "./axios";

export async function getBillingSummary() {
  const { data } = await api.get("/organization-billing/summary");
  return data.summary;
}

export async function getBillingInvoices(params = {}) {
  const { data } = await api.get("/organization-billing/invoices", { params });
  return data.invoices;
}

export async function createBillingInvoice(payload) {
  const { data } = await api.post("/organization-billing/invoices", payload);
  return data.invoice;
}

export async function generateDueBillingInvoices() {
  const { data } = await api.post("/organization-billing/invoices/generate-due");
  return data.invoices;
}

export async function updateBillingInvoiceStatus(id, status) {
  const { data } = await api.patch(`/organization-billing/invoices/${id}/status`, { status });
  return data.invoice;
}

export async function recordOrganizationBillingPayment(id, payload) {
  const { data } = await api.post(`/organization-billing/invoices/${id}/payments`, payload);
  return data.invoice;
}
