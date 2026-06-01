import api from "./axios";

export async function getPayments() {
  const { data } = await api.get("/payments");
  return data.payments;
}

export async function getPayment(id) {
  const { data } = await api.get(`/payments/${id}`);
  return data.payment;
}

export async function getPaymentReceiptPdf(id) {
  const { data } = await api.get(`/payments/${id}/receipt`, { responseType: "blob" });
  return data;
}

export async function createPayment(payload) {
  const { data } = await api.post("/payments", payload);
  return data.payment;
}

export async function updatePayment(id, payload) {
  const { data } = await api.put(`/payments/${id}`, payload);
  return data.payment;
}

export async function deletePayment(id) {
  await api.delete(`/payments/${id}`);
}
