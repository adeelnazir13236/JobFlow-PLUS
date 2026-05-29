import api from "./axios";

export async function getPendingFollowUps() {
  const { data } = await api.get("/followups/pending");
  return data.followUps;
}

export async function markFollowUpDone(id, payload = {}) {
  const { data } = await api.put(`/followups/${id}/done`, payload);
  return data.followUp;
}

export async function recordFollowUpCall(id, payload) {
  const { data } = await api.put(`/followups/${id}/call`, payload);
  return data;
}
