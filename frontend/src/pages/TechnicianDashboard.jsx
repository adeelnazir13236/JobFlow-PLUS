import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTechnicianDashboard } from "../api/technicianService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export default function TechnicianDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setDashboard(await getTechnicianDashboard());
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load technician dashboard");
      }
    }

    loadDashboard();
  }, []);

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (!dashboard) {
    return <Alert type="info">Loading technician workspace...</Alert>;
  }

  const cards = [
    ["Today's Jobs", dashboard.cards.todaysJobs],
    ["Pending Jobs", dashboard.cards.pendingJobs],
    ["Completed Today", dashboard.cards.completedToday],
    ["Upcoming Jobs", dashboard.cards.upcomingJobs]
  ];

  return (
    <>
      <PageHeader title="Field Dashboard" description="Assigned work, progress, and recent activity." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{value || 0}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Today's Jobs</h2>
            <Link to="/technician/jobs/today"><Button variant="secondary">View Today</Button></Link>
          </div>
          <div className="space-y-3">
            {(dashboard.todaysJobs || []).map((job) => (
              <article key={job.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{job.customer?.name || "Customer"}</h3>
                    <p className="text-sm text-slate-500">{formatDate(job.scheduledDate)} at {job.scheduledTime}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mt-3 flex justify-end">
                  <Link to={`/technician/job/${job.id}`}><Button>View Job</Button></Link>
                </div>
              </article>
            ))}
            {!dashboard.todaysJobs?.length && <Alert type="info">No jobs assigned for today.</Alert>}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-950">Recent Activity</h2>
          <div className="space-y-3">
            {(dashboard.recentActivity || []).map((activity) => (
              <article key={activity.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-950">{activity.activityType}</div>
                <div className="mt-1 text-sm text-slate-500">{activity.job?.customer?.name || "Job"} - {activity.notes || "No notes"}</div>
                <div className="mt-2 text-xs text-slate-400">{formatDate(activity.createdAt)}</div>
              </article>
            ))}
            {!dashboard.recentActivity?.length && <Alert type="info">No recent activity yet.</Alert>}
          </div>
        </section>
      </div>
    </>
  );
}
