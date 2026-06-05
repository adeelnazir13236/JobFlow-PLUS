import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTechnicianJobs, startTechnicianJob, resumeTechnicianJob, completeTechnicianJob } from "../api/technicianService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

const viewLabels = {
  today: "Today's Jobs",
  upcoming: "Upcoming Jobs",
  completed: "Completed Jobs"
};

export default function TechnicianJobs() {
  const { view } = useParams();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");
      setJobs(await getTechnicianJobs(view ? { view } : {}));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [view]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return jobs;
    }

    return jobs.filter((job) => [
      job.customer?.name,
      job.customer?.phone,
      job.customer?.area,
      job.customer?.city,
      job.status,
      job.scheduledTime,
      formatDate(job.scheduledDate)
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }, [jobs, search]);

  async function quickAction(job, action) {
    try {
      setError("");
      if (action === "start") await startTechnicianJob(job.id);
      if (action === "resume") await resumeTechnicianJob(job.id);
      if (action === "complete") await completeTechnicianJob(job.id, { remarks: "Completed from technician job list" });
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update job");
    }
  }

  return (
    <>
      <PageHeader title={viewLabels[view] || "My Jobs"} description="Assigned field jobs and quick actions." />
      <div className="mb-4 max-w-xl">
        <Input label="Search jobs" placeholder="Search customer, area, date, or status" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading jobs...</Alert>
      ) : (
        <Table
          columns={[
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "scheduledDate", label: "Date", render: (row) => formatDate(row.scheduledDate) },
            { key: "scheduledTime", label: "Time" },
            { key: "area", label: "Area", render: (row) => row.customer?.area || row.customer?.city || "N/A" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/technician/job/${row.id}`}><Button variant="secondary">View</Button></Link>
                  {["SCHEDULED", "RESCHEDULED"].includes(row.status) && <Button onClick={() => quickAction(row, "start")}>Start</Button>}
                  {row.status === "PAUSED" && <Button onClick={() => quickAction(row, "resume")}>Resume</Button>}
                  {row.status === "IN_PROGRESS" && <Button variant="success" onClick={() => quickAction(row, "complete")}>Complete</Button>}
                </div>
              )
            }
          ]}
          rows={filteredJobs}
          emptyMessage="No assigned jobs found"
        />
      )}
    </>
  );
}
