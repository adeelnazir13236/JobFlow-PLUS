import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../api/dashboardService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const emptySystem = {
  totalOrganizations: 0,
  activeOrganizations: 0,
  inactiveOrganizations: 0,
  totalUsers: 0,
  totalCustomers: 0,
  totalJobs: 0,
  totalFollowUps: 0,
  totalCallLogs: 0,
  recentOrganizations: [],
  recentActivity: []
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export default function SystemDashboard() {
  const [system, setSystem] = useState(emptySystem);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const dashboard = await getDashboard();
        setSystem(dashboard.system || emptySystem);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load system dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const stats = [
    ["Total Organizations", system.totalOrganizations],
    ["Active Organizations", system.activeOrganizations],
    ["Inactive Organizations", system.inactiveOrganizations],
    ["Total Users", system.totalUsers],
    ["Total Customers", system.totalCustomers],
    ["Total Jobs", system.totalJobs],
    ["Follow-ups", system.totalFollowUps],
    ["Call Logs", system.totalCallLogs]
  ];

  return (
    <>
      <PageHeader
        title="System Dashboard"
        description="Global SaaS overview across all organizations."
        action={
          <Link to="/organizations/add">
            <Button>Add Organization</Button>
          </Link>
        }
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Organizations</h2>
            <Link className="text-sm font-medium text-slate-950" to="/organizations">View all</Link>
          </div>
          {loading ? <Alert type="info">Loading organizations...</Alert> : (
            <Table
              columns={[
                { key: "name", label: "Name", render: (row) => <Link className="font-medium text-slate-950" to={`/organizations/${row.id}`}>{row.name}</Link> },
                { key: "plan", label: "Plan" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "users", label: "Users", render: (row) => row._count?.users || 0 },
                { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) }
              ]}
              rows={system.recentOrganizations}
              emptyMessage="No organizations found"
            />
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Activity</h2>
            <span className="text-sm text-slate-500">Latest jobs and customers</span>
          </div>
          {loading ? <Alert type="info">Loading activity...</Alert> : (
            <Table
              columns={[
                { key: "type", label: "Type" },
                { key: "label", label: "Record" },
                { key: "detail", label: "Detail" },
                { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) }
              ]}
              rows={system.recentActivity}
              emptyMessage="No recent activity"
            />
          )}
        </section>
      </div>
    </>
  );
}
