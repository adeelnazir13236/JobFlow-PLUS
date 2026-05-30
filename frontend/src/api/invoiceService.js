import api from "./axios";

export async function getInvoices() {
  const { data } = await api.get("/invoices");
  return data.invoices;
}

export async function getInvoice(id) {
  const { data } = await api.get(`/invoices/${id}`);
  return data.invoice;
}
