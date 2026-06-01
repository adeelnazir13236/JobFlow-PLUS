import api from "./axios";

export async function getQuotations(params = {}) {
  const { data } = await api.get("/quotations", { params });
  return data.quotations;
}

export async function getQuotation(id) {
  const { data } = await api.get(`/quotations/${id}`);
  return data.quotation;
}

export async function getQuotationPdf(id) {
  const { data } = await api.get(`/quotations/${id}/pdf`, { responseType: "blob" });
  return data;
}

export async function createQuotation(payload) {
  const { data } = await api.post("/quotations", payload);
  return data.quotation;
}

export async function updateQuotation(id, payload) {
  const { data } = await api.put(`/quotations/${id}`, payload);
  return data.quotation;
}

export async function updateQuotationStatus(id, status) {
  const { data } = await api.put(`/quotations/${id}/status`, { status });
  return data.quotation;
}

export async function deleteQuotation(id) {
  await api.delete(`/quotations/${id}`);
}

export async function convertQuotationToJob(id, payload = {}) {
  const { data } = await api.post(`/quotations/${id}/convert-job`, payload);
  return data.quotation;
}

export async function convertQuotationToContract(id, payload = {}) {
  const { data } = await api.post(`/quotations/${id}/convert-contract`, payload);
  return data.quotation;
}
