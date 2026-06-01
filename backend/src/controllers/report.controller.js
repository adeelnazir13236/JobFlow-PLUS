import * as reports from "../services/reporting.service.js";

function flattenObject(value, prefix = "", output = {}) {
  if (Array.isArray(value)) {
    output[prefix || "items"] = JSON.stringify(value);
    return output;
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, child] of Object.entries(value)) {
      flattenObject(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  output[prefix] = value instanceof Date ? value.toISOString() : value;
  return output;
}

function rowsFromReport(report) {
  if (Array.isArray(report)) return report;
  if (Array.isArray(report.rows)) return report.rows;

  const nestedRows = Object.entries(report)
    .filter(([, value]) => Array.isArray(value))
    .flatMap(([section, rows]) => rows.map((row) => ({ section, ...row })));

  if (nestedRows.length) return nestedRows;

  return Object.entries(flattenObject(report)).map(([metric, value]) => ({ metric, value }));
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(report) {
  const rows = rowsFromReport(report);
  const headers = [...new Set(rows.flatMap((row) => Object.keys(flattenObject(row))))];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const flat = flattenObject(row);
    lines.push(headers.map((header) => csvEscape(flat[header])).join(","));
  }
  return lines.join("\n");
}

async function sendReport(req, res, loader, filename) {
  const report = await loader(req.user, req.query);
  const format = String(req.query.export || "").toLowerCase();

  if (format === "csv" || format === "excel") {
    const csv = toCsv(report);
    res.setHeader("Content-Type", format === "excel" ? "application/vnd.ms-excel" : "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.${format === "excel" ? "xls" : "csv"}"`);
    res.send(csv);
    return;
  }

  res.json({ report });
}

export const executiveDashboard = (req, res) => sendReport(req, res, reports.getExecutiveDashboardReport, "executive-dashboard");
export const revenueReport = (req, res) => sendReport(req, res, reports.getRevenueReport, "revenue-report");
export const invoiceReport = (req, res) => sendReport(req, res, reports.getInvoiceReport, "invoice-report");
export const paymentReport = (req, res) => sendReport(req, res, reports.getPaymentReport, "payment-report");
export const outstandingBalanceReport = (req, res) => sendReport(req, res, reports.getOutstandingBalanceReport, "outstanding-balances");
export const activeContractsReport = (req, res) => sendReport(req, res, reports.getActiveContractsReport, "active-contracts");
export const expiringContractsReport = (req, res) => sendReport(req, res, reports.getExpiringContractsReport, "expiring-contracts");
export const contractRevenueReport = (req, res) => sendReport(req, res, reports.getContractRevenueReport, "contract-revenue");
export const contractPerformanceReport = (req, res) => sendReport(req, res, reports.getContractPerformanceReport, "contract-performance");
export const jobSummaryReport = (req, res) => sendReport(req, res, reports.getJobSummaryReport, "job-summary");
export const jobStatusReport = (req, res) => sendReport(req, res, reports.getJobStatusReport, "job-status");
export const jobCompletionTrendReport = (req, res) => sendReport(req, res, reports.getJobCompletionTrendReport, "job-completion-trend");
export const technicianPerformanceReport = (req, res) => sendReport(req, res, reports.getTechnicianPerformanceReport, "technician-performance");
export const customerSummaryReport = (req, res) => sendReport(req, res, reports.getCustomerSummaryReport, "customer-summary");
export const customerRevenueReport = (req, res) => sendReport(req, res, reports.getCustomerRevenueReport, "customer-revenue");
export const topCustomersReport = (req, res) => sendReport(req, res, reports.getTopCustomersReport, "top-customers");
export const serviceRequestReport = (req, res) => sendReport(req, res, reports.getServiceRequestReport, "service-requests");
export const chartReport = (req, res) => sendReport(req, res, reports.getChartReport, "report-charts");
