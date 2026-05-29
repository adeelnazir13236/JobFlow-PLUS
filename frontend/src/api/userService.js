import api from "./axios";

export async function getUsers() {
  const { data } = await api.get("/users");
  return data.users;
}

export async function getMe() {
  const { data } = await api.get("/users/me");
  return data.user;
}
