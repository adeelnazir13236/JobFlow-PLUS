import api from "./axios";

export async function getReport(path, params = {}) {
  const { data } = await api.get(`/reports${path}`, { params });
  return data.report;
}

export async function exportReport(path, params = {}, format = "csv") {
  const { data } = await api.get(`/reports${path}`, {
    params: { ...params, export: format },
    responseType: "blob"
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jobflow-report.${format === "excel" ? "xls" : "csv"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const reportPaths = {
  executive: "/executive-dashboard",
  revenue: "/financial/revenue",
  invoices: "/financial/invoices",
  payments: "/financial/payments",
  outstanding: "/financial/outstanding-balances",
  activeContracts: "/contracts/active",
  expiringContracts: "/contracts/expiring",
  contractRevenue: "/contracts/revenue",
  contractPerformance: "/contracts/performance",
  jobSummary: "/jobs/summary",
  jobStatus: "/jobs/status",
  jobCompletionTrend: "/jobs/completion-trend",
  technicianPerformance: "/jobs/technician-performance",
  customerSummary: "/customers/summary",
  customerRevenue: "/customers/revenue",
  topCustomers: "/customers/top",
  serviceRequests: "/service-requests",
  charts: "/charts"
};
