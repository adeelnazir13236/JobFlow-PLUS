import { useEffect, useState } from "react";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import Table from "../components/Table";
import { exportReport, getReport, reportPaths } from "../api/reportService";

const defaultFilters = {
  from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
  to: new Date().toISOString().slice(0, 10)
};

function amount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function date(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function percent(value) {
  return `${Number(value || 0).toLocaleString()}%`;
}

function pickRows(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.rows)) return value.rows;
  return [];
}

function reportError(error) {
  return error.response?.data?.message || "Unable to load report";
}

function Filters({ filters, setFilters, onApply }) {
  return (
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block text-sm font-medium text-slate-700">
          From
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          To
          <input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        </label>
        <Button onClick={onApply}>Apply</Button>
      </div>
    </section>
  );
}

function Cards({ items }) {
  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-slate-200 bg-white p-5">
          <div className="text-sm font-medium text-slate-500">{item.label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
          {item.detail && <div className="mt-1 text-xs text-slate-500">{item.detail}</div>}
        </div>
      ))}
    </div>
  );
}

function MiniBars({ title, rows = [], valueKey = "value" }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || row.count || 0)), 1);
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-950">{title}</h2>
      <div className="space-y-3">
        {rows.length === 0 && <div className="text-sm text-slate-500">No data for selected range.</div>}
        {rows.map((row) => {
          const value = Number(row[valueKey] || row.count || 0);
          return (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
                <span>{row.label}</span>
                <span>{value.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-sky-600" style={{ width: `${Math.max((value / max) * 100, 3)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExportActions({ path, filters }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => exportReport(path, filters, "csv")}>Export CSV</Button>
      <Button variant="secondary" onClick={() => exportReport(path, filters, "excel")}>Export Excel</Button>
    </div>
  );
}

function useReports(loaders) {
  const [filters, setFilters] = useState(defaultFilters);
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(next = filters) {
    try {
      setLoading(true);
      setError("");
      const entries = await Promise.all(loaders.map(async ([key, path, extra = {}]) => [key, await getReport(path, { ...next, ...extra })]));
      setData(Object.fromEntries(entries));
    } catch (err) {
      setError(reportError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return { filters, setFilters, data, error, loading, load };
}

export function ExecutiveReports() {
  const { filters, setFilters, data, error, loading, load } = useReports([["executive", reportPaths.executive]]);
  const report = data.executive || {};
  const cards = report.cards || {};
  return (
    <>
      <PageHeader title="Executive Dashboard" description="Business-wide analytics and performance signals." action={<ExportActions path={reportPaths.executive} filters={filters} />} />
      <Filters filters={filters} setFilters={setFilters} onApply={() => load()} />
      {error && <Alert>{error}</Alert>}
      {loading ? <Alert type="info">Loading report...</Alert> : (
        <>
          <Cards items={[
            { label: "Revenue This Month", value: amount(cards.revenueThisMonth) },
            { label: "Revenue This Year", value: amount(cards.revenueThisYear) },
            { label: "Outstanding Balance", value: amount(cards.outstandingBalance) },
            { label: "Active Contracts", value: cards.activeContracts || 0 },
            { label: "Pending Jobs", value: cards.pendingJobs || 0 },
            { label: "Open Service Requests", value: cards.openServiceRequests || 0 }
          ]} />
          <div className="grid gap-5 xl:grid-cols-3">
            <MiniBars title="Revenue Trend" rows={report.charts?.revenueTrend || []} />
            <MiniBars title="Invoice Trend" rows={report.charts?.invoiceTrend || []} />
            <MiniBars title="Job Completion Trend" rows={report.charts?.jobCompletionTrend || []} valueKey="count" />
          </div>
        </>
      )}
    </>
  );
}

export function FinancialReports() {
  const { filters, setFilters, data, error, loading, load } = useReports([
    ["revenue", reportPaths.revenue],
    ["invoices", reportPaths.invoices],
    ["payments", reportPaths.payments],
    ["outstanding", reportPaths.outstanding]
  ]);
  return (
    <>
      <PageHeader title="Financial Reports" description="Revenue, invoices, payments, and outstanding balances." action={<ExportActions path={reportPaths.outstanding} filters={filters} />} />
      <Filters filters={filters} setFilters={setFilters} onApply={() => load()} />
      {error && <Alert>{error}</Alert>}
      {loading ? <Alert type="info">Loading report...</Alert> : (
        <div className="space-y-6">
          <Cards items={[
            { label: "Total Revenue", value: amount(data.revenue?.totalRevenue) },
            { label: "Generated Invoices", value: data.invoices?.summary?.generated || 0 },
            { label: "Paid Invoices", value: data.invoices?.summary?.paid || 0 },
            { label: "Outstanding Amount", value: amount(data.invoices?.summary?.outstandingAmount) },
            { label: "Payments Received", value: amount(data.payments?.summary?.totalReceived) }
          ]} />
          <div className="grid gap-5 xl:grid-cols-2">
            <MiniBars title="Revenue by Month" rows={data.revenue?.byMonth || []} />
            <MiniBars title="Payments by Method" rows={data.payments?.byMethod || []} />
          </div>
          <Table columns={[
            { key: "customer", label: "Customer" },
            { key: "invoiceCount", label: "Invoices" },
            { key: "outstandingAmount", label: "Outstanding", render: (row) => amount(row.outstandingAmount) },
            { key: "current", label: "Current", render: (row) => amount(row.current) },
            { key: "days1To30", label: "1-30", render: (row) => amount(row.days1To30) },
            { key: "days31To60", label: "31-60", render: (row) => amount(row.days31To60) },
            { key: "days61To90", label: "61-90", render: (row) => amount(row.days61To90) },
            { key: "days90Plus", label: "90+", render: (row) => amount(row.days90Plus) }
          ]} rows={pickRows(data.outstanding)} />
        </div>
      )}
    </>
  );
}

export function ContractReports() {
  const { filters, setFilters, data, error, loading, load } = useReports([
    ["active", reportPaths.activeContracts],
    ["expiring", reportPaths.expiringContracts, { days: 90 }],
    ["revenue", reportPaths.contractRevenue],
    ["performance", reportPaths.contractPerformance]
  ]);
  return (
    <>
      <PageHeader title="Contract Reports" description="Active contracts, expiring work, revenue, and visit progress." action={<ExportActions path={reportPaths.contractPerformance} filters={filters} />} />
      <Filters filters={filters} setFilters={setFilters} onApply={() => load()} />
      {error && <Alert>{error}</Alert>}
      {loading ? <Alert type="info">Loading report...</Alert> : (
        <div className="space-y-6">
          <Table columns={[
            { key: "contractNumber", label: "Contract" },
            { key: "customer", label: "Customer" },
            { key: "startDate", label: "Start", render: (row) => date(row.startDate) },
            { key: "endDate", label: "End", render: (row) => date(row.endDate) },
            { key: "contractValue", label: "Value", render: (row) => amount(row.contractValue) },
            { key: "progress", label: "Progress", render: (row) => percent(row.progress) }
          ]} rows={pickRows(data.active)} />
          <div className="grid gap-5 xl:grid-cols-2">
            <MiniBars title="Contract Revenue" rows={data.revenue?.byContract || []} />
            <Table columns={[
              { key: "contractNumber", label: "Expiring Contract" },
              { key: "customer", label: "Customer" },
              { key: "endDate", label: "End Date", render: (row) => date(row.endDate) },
              { key: "contractValue", label: "Value", render: (row) => amount(row.contractValue) }
            ]} rows={pickRows(data.expiring)} />
          </div>
        </div>
      )}
    </>
  );
}

export function JobReports() {
  const { filters, setFilters, data, error, loading, load } = useReports([
    ["summary", reportPaths.jobSummary],
    ["status", reportPaths.jobStatus],
    ["trend", reportPaths.jobCompletionTrend],
    ["technician", reportPaths.technicianPerformance]
  ]);
  const summary = data.summary?.summary || {};
  return (
    <>
      <PageHeader title="Job Reports" description="Job status, completion trends, and technician performance." action={<ExportActions path={reportPaths.technicianPerformance} filters={filters} />} />
      <Filters filters={filters} setFilters={setFilters} onApply={() => load()} />
      {error && <Alert>{error}</Alert>}
      {loading ? <Alert type="info">Loading report...</Alert> : (
        <div className="space-y-6">
          <Cards items={[
            { label: "Total Jobs", value: summary.totalJobs || 0 },
            { label: "Completed Jobs", value: summary.completedJobs || 0 },
            { label: "Cancelled Jobs", value: summary.cancelledJobs || 0 },
            { label: "Missed Jobs", value: summary.missedJobs || 0 }
          ]} />
          <div className="grid gap-5 xl:grid-cols-2">
            <MiniBars title="Jobs by Status" rows={data.status?.byStatus || []} valueKey="count" />
            <MiniBars title="Completion Trend" rows={data.trend?.byMonth || []} valueKey="count" />
          </div>
          <Table columns={[
            { key: "technician", label: "Technician" },
            { key: "jobsAssigned", label: "Assigned" },
            { key: "jobsCompleted", label: "Completed" },
            { key: "completionRate", label: "Completion", render: (row) => percent(row.completionRate) }
          ]} rows={pickRows(data.technician)} />
        </div>
      )}
    </>
  );
}

export function CustomerReports() {
  const { filters, setFilters, data, error, loading, load } = useReports([
    ["summary", reportPaths.customerSummary],
    ["revenue", reportPaths.customerRevenue],
    ["top", reportPaths.topCustomers]
  ]);
  const summary = data.summary?.summary || {};
  return (
    <>
      <PageHeader title="Customer Reports" description="Customer growth, rankings, and revenue contribution." action={<ExportActions path={reportPaths.customerRevenue} filters={filters} />} />
      <Filters filters={filters} setFilters={setFilters} onApply={() => load()} />
      {error && <Alert>{error}</Alert>}
      {loading ? <Alert type="info">Loading report...</Alert> : (
        <div className="space-y-6">
          <Cards items={[
            { label: "Total Customers", value: summary.totalCustomers || 0 },
            { label: "Active Customers", value: summary.activeCustomers || 0 },
            { label: "New Customers", value: summary.newCustomers || 0 }
          ]} />
          <Table columns={[
            { key: "customer", label: "Customer" },
            { key: "totalQuotations", label: "Quotations" },
            { key: "totalInvoices", label: "Invoices" },
            { key: "totalPayments", label: "Payments" },
            { key: "revenueGenerated", label: "Revenue", render: (row) => amount(row.revenueGenerated) }
          ]} rows={pickRows(data.revenue)} />
        </div>
      )}
    </>
  );
}

export function ServiceRequestReports() {
  const { filters, setFilters, data, error, loading, load } = useReports([["requests", reportPaths.serviceRequests]]);
  const report = data.requests || {};
  return (
    <>
      <PageHeader title="Service Request Reports" description="Complaints, revisits, categories, and request status." action={<ExportActions path={reportPaths.serviceRequests} filters={filters} />} />
      <Filters filters={filters} setFilters={setFilters} onApply={() => load()} />
      {error && <Alert>{error}</Alert>}
      {loading ? <Alert type="info">Loading report...</Alert> : (
        <div className="space-y-6">
          <Cards items={[
            { label: "Open Requests", value: report.open?.length || 0 },
            { label: "Closed Requests", value: report.closed?.length || 0 },
            { label: "Avg Resolution Hours", value: report.performance?.averageResolutionHours || 0 }
          ]} />
          <MiniBars title="Request Types" rows={report.byType || []} valueKey="count" />
          <Table columns={[
            { key: "requestNumber", label: "Request" },
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || row.customer },
            { key: "requestType", label: "Type" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Created", render: (row) => date(row.createdAt) }
          ]} rows={report.open || []} />
        </div>
      )}
    </>
  );
}
