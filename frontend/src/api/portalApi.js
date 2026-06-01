import axios from "axios";

const portalApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("portalToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("portalToken");
      localStorage.removeItem("portalUser");
      if (!window.location.pathname.includes("/portal/login")) {
        window.location.href = "/portal/login";
      }
    }
    return Promise.reject(error);
  }
);

export default portalApi;

export async function portalLogin(payload) {
  const { data } = await portalApi.post("/portal/auth/login", payload);
  return data;
}

export async function portalMe() {
  const { data } = await portalApi.get("/portal/auth/me");
  return data.user;
}

export async function getPortalDashboard() {
  const { data } = await portalApi.get("/portal/dashboard");
  return data.dashboard;
}

export async function getPortalQuotations() {
  const { data } = await portalApi.get("/portal/quotations");
  return data.quotations;
}

export async function getPortalQuotation(id) {
  const { data } = await portalApi.get(`/portal/quotations/${id}`);
  return data.quotation;
}

export async function approvePortalQuotation(id) {
  const { data } = await portalApi.put(`/portal/quotations/${id}/approve`);
  return data.quotation;
}

export async function rejectPortalQuotation(id) {
  const { data } = await portalApi.put(`/portal/quotations/${id}/reject`);
  return data.quotation;
}

export async function getPortalQuotationPdf(id) {
  const { data } = await portalApi.get(`/portal/quotations/${id}/pdf`, { responseType: "blob" });
  return data;
}

export async function getPortalContracts() {
  const { data } = await portalApi.get("/portal/contracts");
  return data.contracts;
}

export async function getPortalContract(id) {
  const { data } = await portalApi.get(`/portal/contracts/${id}`);
  return data.contract;
}

export async function getPortalJobs() {
  const { data } = await portalApi.get("/portal/jobs");
  return data.jobs;
}

export async function getPortalJob(id) {
  const { data } = await portalApi.get(`/portal/jobs/${id}`);
  return data.job;
}

export async function getPortalInvoices() {
  const { data } = await portalApi.get("/portal/invoices");
  return data.invoices;
}

export async function getPortalInvoice(id) {
  const { data } = await portalApi.get(`/portal/invoices/${id}`);
  return data.invoice;
}

export async function getPortalInvoicePdf(id) {
  const { data } = await portalApi.get(`/portal/invoices/${id}/pdf`, { responseType: "blob" });
  return data;
}

export async function getPortalPayments() {
  const { data } = await portalApi.get("/portal/payments");
  return data.payments;
}

export async function getPortalPayment(id) {
  const { data } = await portalApi.get(`/portal/payments/${id}`);
  return data.payment;
}

export async function getPortalPaymentReceipt(id) {
  const { data } = await portalApi.get(`/portal/payments/${id}/receipt`, { responseType: "blob" });
  return data;
}

export async function getPortalServiceRequests() {
  const { data } = await portalApi.get("/portal/service-requests");
  return data.serviceRequests;
}

export async function getPortalServiceRequest(id) {
  const { data } = await portalApi.get(`/portal/service-requests/${id}`);
  return data.serviceRequest;
}

export async function createPortalServiceRequest(payload) {
  const { data } = await portalApi.post("/portal/service-requests", payload);
  return data.serviceRequest;
}
