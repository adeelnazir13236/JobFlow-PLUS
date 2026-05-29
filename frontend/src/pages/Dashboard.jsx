import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../api/dashboardService";
import { completeJob } from "../api/jobService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  CustomersIcon,
  FollowUpIcon,
  JobsIcon,
  PaymentIcon,
  RevenueIcon
} from "../components/Icons";
import JobCompletionModal from "../components/JobCompletionModal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const emptyDashboard = {
  cards: {
    totalCustomers: 0,
    todaysScheduledJobs: 0,
    pendingFollowUps: 0,
    completedJobsThisMonth: 0,
    cancelledJobs: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    paidPayments: 0,
    partialPayments: 0
  },
  todaysJobs: [],
  overdueFollowUps: [],
  recentCallLogs: []
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [jobToComplete, setJobToComplete] = useState(null);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      setDashboard(await getDashboard());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleCompleteJob(payload) {
    try {
      setActionLoadingId(jobToComplete.id);
      setError("");
      await completeJob(jobToComplete.id, payload);
      setJobToComplete(null);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to complete job");
    } finally {
      setActionLoadingId(null);
    }
  }

  const operationStats = [
    {
      label: "Total Customers",
      value: dashboard.cards.totalCustomers,
      detail: "Active customer base",
      tone: "border-blue-100 bg-blue-50 text-[var(--brand-blue)]",
      icon: CustomersIcon
    },
    {
      label: "Today's Jobs",
      value: dashboard.cards.todaysScheduledJobs,
      detail: "Scheduled for today",
      tone: "border-emerald-100 bg-emerald-50 text-[var(--brand-green)]",
      icon: JobsIcon
    },
    {
      label: "Pending Follow-ups",
      value: dashboard.cards.pendingFollowUps,
      detail: "Due or overdue calls",
      tone: "border-amber-100 bg-amber-50 text-amber-700",
      icon: FollowUpIcon
    },
    {
      label: "Completed This Month",
      value: dashboard.cards.completedJobsThisMonth,
      detail: "Closed field jobs",
      tone: "border-violet-100 bg-violet-50 text-violet-700",
      icon: CheckIcon
    },
    {
      label: "Cancelled Jobs",
      value: dashboard.cards.cancelledJobs,
      detail: "Needs review",
      tone: "border-red-100 bg-red-50 text-red-700",
      icon: AlertIcon
    }
  ];

  const financeStats = [
    {
      label: "Total Revenue",
      value: formatAmount(dashboard.cards.totalRevenue),
      detail: "Received payments",
      tone: "border-emerald-100 bg-emerald-50 text-[var(--brand-green)]",
      icon: RevenueIcon
    },
    {
      label: "Pending Payments",
      value: dashboard.cards.pendingPayments,
      detail: "No amount received",
      tone: "border-amber-100 bg-amber-50 text-amber-700",
      icon: ClockIcon
    },
    {
      label: "Paid Payments",
      value: dashboard.cards.paidPayments,
      detail: "Fully settled",
      tone: "border-blue-100 bg-blue-50 text-[var(--brand-blue)]",
      icon: PaymentIcon
    },
    {
      label: "Partial Payments",
      value: dashboard.cards.partialPayments,
      detail: "Balance remaining",
      tone: "border-orange-100 bg-orange-50 text-[var(--brand-orange)]",
      icon: PaymentIcon
    }
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Daily overview for customer operations and field work." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Operations</h2>
          <span className="text-sm text-slate-500">Live workload snapshot</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {operationStats.map((stat) => (
            <div key={stat.label} className="interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{stat.value}</div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${stat.tone}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-500">{stat.detail}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Payments</h2>
          <span className="text-sm text-slate-500">Collection and invoice status</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {financeStats.map((stat) => (
            <div key={stat.label} className="interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">{stat.value}</div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${stat.tone}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-500">{stat.detail}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Today's Jobs</h2>
            <span className="text-sm text-slate-500">{dashboard.todaysJobs.length} scheduled</span>
          </div>
          {loading ? <Alert type="info">Loading jobs...</Alert> : (
          <Table
            columns={[
              { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
              { key: "phone", label: "Phone", render: (row) => row.customer?.phone || "N/A" },
              { key: "scheduledTime", label: "Time" },
              { key: "assignedStaff", label: "Staff", render: (row) => row.assignedStaff?.name || "Unassigned" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex gap-2">
                    <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/jobs/${row.id}`}>
                      View
                    </Link>
                    {row.status !== "COMPLETED" && (
                      <Button className="min-h-9 px-3" onClick={() => setJobToComplete(row)} disabled={actionLoadingId === row.id}>
                        {actionLoadingId === row.id ? "Saving..." : "Complete"}
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
            rows={dashboard.todaysJobs}
            emptyMessage="No jobs scheduled for today"
          />
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Overdue Follow-ups</h2>
            <span className="text-sm text-slate-500">{dashboard.overdueFollowUps.length} waiting</span>
          </div>
          {loading ? <Alert type="info">Loading follow-ups...</Alert> : (
          <Table
            columns={[
              { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
              { key: "phone", label: "Phone", render: (row) => row.customer?.phone || "N/A" },
              { key: "lastJobDate", label: "Last Job", render: (row) => formatDate(row.job?.scheduledDate) },
              { key: "followUpDate", label: "Follow-up Date", render: (row) => formatDate(row.followUpDate) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              {
                key: "actions",
                label: "Actions",
                render: () => (
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to="/followups">
                    Call
                  </Link>
                )
              }
            ]}
            rows={dashboard.overdueFollowUps}
            emptyMessage="No overdue follow-ups"
          />
          )}
        </section>
      </div>
      <div className="mt-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Call Logs</h2>
            <span className="text-sm text-slate-500">{dashboard.recentCallLogs.length} latest entries</span>
          </div>
          {loading ? <Alert type="info">Loading call logs...</Alert> : (
          <Table
            columns={[
              { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
              { key: "phone", label: "Phone", render: (row) => row.customer?.phone || "N/A" },
              { key: "agent", label: "Agent", render: (row) => row.agent?.name || "N/A" },
              { key: "response", label: "Response" },
              { key: "nextCallDate", label: "Next Call", render: (row) => formatDate(row.nextCallDate) },
              { key: "createdAt", label: "Logged", render: (row) => formatDate(row.createdAt) },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/customers/${row.customerId}`}>
                    Customer
                  </Link>
                )
              }
            ]}
            rows={dashboard.recentCallLogs}
            emptyMessage="No recent call logs"
          />
          )}
        </section>
      </div>
      <JobCompletionModal
        job={jobToComplete}
        loading={actionLoadingId === jobToComplete?.id}
        onClose={() => setJobToComplete(null)}
        onConfirm={handleCompleteJob}
      />
    </>
  );
}
