import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { completeJob, getJobs } from "../api/jobService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import JobCompletionModal from "../components/JobCompletionModal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const statuses = ["ALL", "SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [jobToComplete, setJobToComplete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");
      setJobs(await getJobs());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesStatus = activeStatus === "ALL" || job.status === activeStatus;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        job.customer?.name,
        job.customer?.phone,
        job.customer?.area,
        job.customer?.city,
        job.assignedAgent?.name,
        job.assignedAgent?.email,
        job.assignedStaff?.name,
        job.assignedStaff?.email,
        job.status,
        job.scheduledTime,
        formatDate(job.scheduledDate),
        formatDate(job.completionDate),
        job.remarks
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeStatus, jobs, search]);

  async function handleComplete(payload) {
    try {
      setActionLoadingId(jobToComplete.id);
      setError("");
      await completeJob(jobToComplete.id, payload);
      setJobToComplete(null);
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to complete job");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Track scheduled, rescheduled, completed, and cancelled jobs."
        action={
          <Link to="/jobs/schedule">
            <Button>Schedule Job</Button>
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((status) => (
          <Button
            key={status}
            variant={activeStatus === status ? "primary" : "secondary"}
            onClick={() => setActiveStatus(status)}
          >
            {status}
          </Button>
        ))}
      </div>
      <div className="mb-4 max-w-xl">
        <Input
          label="Search jobs"
          placeholder="Search by customer, agent, staff, status, date, or remarks"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading jobs...</Alert>
      ) : (
        <Table
          columns={[
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "assignedAgent", label: "Agent", render: (row) => row.assignedAgent?.name || "Unassigned" },
            { key: "assignedStaff", label: "Staff", render: (row) => row.assignedStaff?.name || "Unassigned" },
            { key: "scheduledDate", label: "Date", render: (row) => formatDate(row.scheduledDate) },
            { key: "scheduledTime", label: "Time" },
            { key: "completionDate", label: "Completed", render: (row) => formatDate(row.completionDate) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/jobs/${row.id}/edit`}>
                    Edit
                  </Link>
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/jobs/${row.id}`}>
                    View
                  </Link>
                  {row.status !== "COMPLETED" && (
                    <Button className="min-h-9 px-3" onClick={() => setJobToComplete(row)} disabled={actionLoadingId === row.id}>
                      {actionLoadingId === row.id ? "Saving..." : "Complete"}
                    </Button>
                  )}
                  {row.status === "COMPLETED" && (
                    <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/payments/add?customerId=${row.customerId}&jobId=${row.id}`}>
                      Add Payment
                    </Link>
                  )}
                </div>
              )
            }
          ]}
          rows={filteredJobs}
          emptyMessage={`No ${activeStatus.toLowerCase()} jobs found`}
        />
      )}
      <JobCompletionModal
        job={jobToComplete}
        loading={actionLoadingId === jobToComplete?.id}
        onClose={() => setJobToComplete(null)}
        onConfirm={handleComplete}
      />
    </>
  );
}
