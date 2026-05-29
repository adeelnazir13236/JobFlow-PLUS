import api from "./axios";

export async function getPlans() {
  const { data } = await api.get("/plans");
  return data.plans;
}

export async function createPlan(payload) {
  const { data } = await api.post("/plans", payload);
  return data.plan;
}

export async function updatePlan(id, payload) {
  const { data } = await api.put(`/plans/${id}`, payload);
  return data.plan;
}

export async function savePlanFeatures(id, featureIds) {
  const { data } = await api.put(`/plans/${id}/features`, { featureIds });
  return data.plan;
}

export async function getFeatures() {
  const { data } = await api.get("/plans/features");
  return data.features;
}

export async function createFeature(payload) {
  const { data } = await api.post("/plans/features", payload);
  return data.feature;
}

export async function updateFeature(id, payload) {
  const { data } = await api.put(`/plans/features/${id}`, payload);
  return data.feature;
}
