import api from "./axios";

export async function getOrganizations(params = {}) {
  const { data } = await api.get("/organizations", { params });
  return data.organizations;
}

export async function getOrganization(id) {
  const { data } = await api.get(`/organizations/${id}`);
  return data.organization;
}

export async function createOrganization(payload) {
  const { data } = await api.post("/organizations", payload);
  return data.organization;
}

export async function updateOrganization(id, payload) {
  const { data } = await api.put(`/organizations/${id}`, payload);
  return data.organization;
}

export async function updateOrganizationSubscription(id, payload) {
  const { data } = await api.put(`/organizations/${id}/subscription`, payload);
  return data.subscription;
}

export async function updateOrganizationFeatureOverrides(id, overrides) {
  const { data } = await api.put(`/organizations/${id}/features`, { overrides });
  return data.featureOverrides;
}
