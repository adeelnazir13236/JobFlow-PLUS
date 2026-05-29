import api from "./axios";

export async function getCustomers() {
  const { data } = await api.get("/customers");
  return data.customers;
}

export async function getCustomer(id) {
  const { data } = await api.get(`/customers/${id}`);
  return data.customer;
}

export async function createCustomer(payload) {
  const { data } = await api.post("/customers", payload);
  return data.customer;
}

export async function updateCustomer(id, payload) {
  const { data } = await api.put(`/customers/${id}`, payload);
  return data.customer;
}

export async function deleteCustomer(id) {
  await api.delete(`/customers/${id}`);
}

export async function getCustomerCallLogs(id) {
  const { data } = await api.get(`/customers/${id}/call-logs`);
  return data.callLogs;
}
