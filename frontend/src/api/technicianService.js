import api from "./axios";

export async function getTechnicianDashboard() {
  const { data } = await api.get("/technician/dashboard");
  return data.dashboard;
}

export async function getTechnicianJobs(params = {}) {
  const { data } = await api.get("/technician/jobs", { params });
  return data.jobs;
}

export async function getTechnicianJob(id) {
  const { data } = await api.get(`/technician/jobs/${id}`);
  return data.job;
}

export async function startTechnicianJob(id) {
  const { data } = await api.post(`/technician/jobs/${id}/start`);
  return data.job;
}

export async function pauseTechnicianJob(id, payload = {}) {
  const { data } = await api.post(`/technician/jobs/${id}/pause`, payload);
  return data.job;
}

export async function resumeTechnicianJob(id) {
  const { data } = await api.post(`/technician/jobs/${id}/resume`);
  return data.job;
}

export async function completeTechnicianJob(id, payload = {}) {
  const { data } = await api.post(`/technician/jobs/${id}/complete`, payload);
  return data.job;
}

export async function checkInTechnicianJob(id, payload = {}) {
  const { data } = await api.post(`/technician/jobs/${id}/check-in`, payload);
  return data;
}

export async function checkOutTechnicianJob(id, payload = {}) {
  const { data } = await api.post(`/technician/jobs/${id}/check-out`, payload);
  return data;
}

export async function addTechnicianNote(id, note) {
  const { data } = await api.post(`/technician/jobs/${id}/notes`, { note });
  return data.note;
}

export async function uploadTechnicianAttachment(id, payload) {
  const { data } = await api.post(`/technician/jobs/${id}/attachments`, payload);
  return data.attachment;
}

export async function captureTechnicianSignature(id, payload) {
  const { data } = await api.post(`/technician/jobs/${id}/signatures`, payload);
  return data.signature;
}

export async function updateTechnicianChecklistItem(id, itemId, completed) {
  const { data } = await api.patch(`/technician/jobs/${id}/checklist/${itemId}`, { completed });
  return data.item;
}

export async function getTechnicianProfile() {
  const { data } = await api.get("/technician/profile");
  return data.profile;
}
