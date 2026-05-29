import api from "./axios";

export async function getUsers(params = {}) {
  const { data } = await api.get("/users", { params });
  return data.users;
}

export async function getMe() {
  const { data } = await api.get("/users/me");
  return data.user;
}

export async function createOrganizationAdmin(payload) {
  const { data } = await api.post("/users/organization-admins", payload);
  return data.user;
}

export async function createUser(payload) {
  const { data } = await api.post("/users", payload);
  return data.user;
}

export async function updateUser(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload);
  return data.user;
}

export async function resetUserPassword(id, password) {
  const { data } = await api.patch(`/users/${id}/password`, { password });
  return data;
}
