import api from "./axios";

export async function getCallLogs(params = {}) {
  const { data } = await api.get("/call-logs", { params });
  return data.callLogs;
}

export async function getCallLog(id) {
  const { data } = await api.get(`/call-logs/${id}`);
  return data.callLog;
}

export async function createCallLog(payload) {
  const { data } = await api.post("/call-logs", payload);
  return data.callLog;
}

export async function updateCallLog(id, payload) {
  const { data } = await api.put(`/call-logs/${id}`, payload);
  return data.callLog;
}
