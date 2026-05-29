import api from "./axios";

export async function getJobs() {
  const { data } = await api.get("/jobs");
  return data.jobs;
}

export async function getCalendarJobs() {
  const { data } = await api.get("/jobs/calendar");
  return data.jobs;
}

export async function getJob(id) {
  const { data } = await api.get(`/jobs/${id}`);
  return data.job;
}

export async function createJob(payload) {
  const { data } = await api.post("/jobs", payload);
  return data.job;
}

export async function updateJob(id, payload) {
  const { data } = await api.put(`/jobs/${id}`, payload);
  return data.job;
}

export async function completeJob(id, payload = {}) {
  const { data } = await api.put(`/jobs/${id}/complete`, payload);
  return data.job;
}
