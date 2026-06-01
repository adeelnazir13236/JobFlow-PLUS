import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPortalDashboard } from "../api/portalApi";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortalDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPortalDashboard().then(setDashboard).catch((err) => setError(err.response?.data?.message || "Unable to load dashboard"));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!dashboard) return <Alert type="info">Loading portal dashboard...</Alert>;

  const cards = [
    ["Active Contracts", dashboard.cards.activeContracts],
    ["Upcoming Jobs", dashboard.cards.upcomingJobs],
    ["Pending Quotations", dashboard.cards.pendingQuotations],
    ["Outstanding Invoices", dashboard.cards.outstandingInvoices],
    ["Open Requests", dashboard.cards.openRequests]
  ];

  return (
    <>
      <PageHeader title="Portal Dashboard" description="Your service activity, billing, and requests." />
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold">Recent Jobs</h2>
          <Table columns={[
            { key: "id", label: "Job", render: (row) => <Link to={`/portal/jobs/${row.id}`}>#{row.id}</Link> },
            { key: "scheduledDate", label: "Date", render: (row) => formatDate(row.scheduledDate) },
            { key: "status", label: "Status" }
          ]} rows={dashboard.recentJobs || []} />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">Recent Invoices</h2>
          <Table columns={[
            { key: "invoiceNumber", label: "Invoice", render: (row) => <Link to={`/portal/invoices/${row.id}`}>{row.invoiceNumber}</Link> },
            { key: "amount", label: "Amount", render: (row) => formatAmount(row.amount) },
            { key: "status", label: "Status" }
          ]} rows={dashboard.recentInvoices || []} />
        </section>
      </div>
    </>
  );
}
