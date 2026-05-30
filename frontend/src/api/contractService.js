import api from "./axios";

export async function getContracts(params = {}) {
  const { data } = await api.get("/contracts", { params });
  return data.contracts;
}

export async function getContract(id) {
  const { data } = await api.get(`/contracts/${id}`);
  return data.contract;
}

export async function createContract(payload) {
  const { data } = await api.post("/contracts", payload);
  return data.contract;
}

export async function updateContract(id, payload) {
  const { data } = await api.put(`/contracts/${id}`, payload);
  return data.contract;
}

export async function activateContract(id) {
  const { data } = await api.put(`/contracts/${id}/activate`);
  return data.contract;
}

export async function pauseContract(id) {
  const { data } = await api.put(`/contracts/${id}/pause`);
  return data.contract;
}

export async function cancelContract(id) {
  const { data } = await api.put(`/contracts/${id}/cancel`);
  return data.contract;
}

export async function addContractService(id, payload) {
  const { data } = await api.post(`/contracts/${id}/services`, payload);
  return data.service;
}

export async function addBillingRule(id, payload) {
  const { data } = await api.post(`/contracts/${id}/billing-rules`, payload);
  return data.billingRule;
}
