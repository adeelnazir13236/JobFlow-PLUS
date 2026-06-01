import api from "./axios";

export async function getServiceRequests(params = {}) {
  const { data } = await api.get("/service-requests", { params });
  return data.serviceRequests;
}

export async function getServiceRequest(id) {
  const { data } = await api.get(`/service-requests/${id}`);
  return data.serviceRequest;
}

export async function updateServiceRequestStatus(id, status) {
  const { data } = await api.patch(`/service-requests/${id}/status`, { status });
  return data.serviceRequest;
}

export async function convertServiceRequestToJob(id, payload) {
  const { data } = await api.post(`/service-requests/${id}/convert-job`, payload);
  return data.serviceRequest;
}
