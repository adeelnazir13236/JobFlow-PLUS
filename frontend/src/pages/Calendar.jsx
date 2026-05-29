import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { useEffect, useMemo, useState } from "react";
import { getCalendarJobs, updateJob } from "../api/jobService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

const statusColors = {
  SCHEDULED: { backgroundColor: "#0284c7", borderColor: "#0369a1" },
  COMPLETED: { backgroundColor: "#059669", borderColor: "#047857" },
  CANCELLED: { backgroundColor: "#dc2626", borderColor: "#b91c1c" },
  RESCHEDULED: { backgroundColor: "#d97706", borderColor: "#b45309" }
};

const statuses = ["ALL", "SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"];

function displayName(user) {
  return user?.name || "Unassigned";
}

export default function Calendar() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filters, setFilters] = useState({ status: "ALL", agentId: "ALL", staffId: "ALL" });
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("SCHEDULED");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [error, setError] = useState("");

  async function loadCalendarJobs() {
    try {
      setLoading(true);
      setError("");
      setJobs(await getCalendarJobs());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load calendar jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarJobs();
  }, []);

  const agents = useMemo(() => {
    const map = new Map();
    jobs.forEach((job) => {
      if (job.assignedAgent) {
        map.set(job.assignedAgent.id, job.assignedAgent);
      }
    });
    return Array.from(map.values());
  }, [jobs]);

  const staff = useMemo(() => {
    const map = new Map();
    jobs.forEach((job) => {
      if (job.assignedStaff) {
        map.set(job.assignedStaff.id, job.assignedStaff);
      }
    });
    return Array.from(map.values());
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const statusMatches = filters.status === "ALL" || job.status === filters.status;
      const agentMatches = filters.agentId === "ALL" || job.assignedAgent?.id === Number(filters.agentId);
      const staffMatches = filters.staffId === "ALL" || job.assignedStaff?.id === Number(filters.staffId);

      return statusMatches && agentMatches && staffMatches;
    });
  }, [filters, jobs]);

  const events = useMemo(() => {
    return filteredJobs.map((job) => ({
      id: String(job.id),
      title: `${job.customer.name} - ${job.scheduledTime}`,
      date: job.date,
      extendedProps: job,
      ...(statusColors[job.status] || statusColors.SCHEDULED)
    }));
  }, [filteredJobs]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function openJobModal(job) {
    setSelectedJob(job);
    setSelectedStatus(job.status);
    setRescheduleDate(new Date(job.date).toISOString().slice(0, 10));
    setRescheduleTime(job.scheduledTime || "");
  }

  async function handleStatusUpdate() {
    if (!selectedJob) {
      return;
    }

    try {
      if (selectedStatus === "RESCHEDULED" && (!rescheduleDate || !rescheduleTime)) {
        setError("Please select a new date and time to reschedule this job");
        return;
      }

      setSavingStatus(true);
      setError("");
      await updateJob(selectedJob.id, {
        customerId: selectedJob.customer.id,
        assignedAgentId: selectedJob.assignedAgent?.id || null,
        assignedStaffId: selectedJob.assignedStaff?.id || null,
        scheduledDate: selectedStatus === "RESCHEDULED" ? rescheduleDate : selectedJob.date,
        scheduledTime: selectedStatus === "RESCHEDULED" ? rescheduleTime : selectedJob.scheduledTime,
        status: selectedStatus
      });
      setSelectedJob(null);
      await loadCalendarJobs();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update job status");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <>
      <PageHeader title="Calendar" description="Monthly job schedule for field teams." />
      <div className="interactive-card mb-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Agent</span>
          <select
            value={filters.agentId}
            onChange={(event) => updateFilter("agentId", event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="ALL">ALL</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Staff</span>
          <select
            value={filters.staffId}
            onChange={(event) => updateFilter("staffId", event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="ALL">ALL</option>
            {staff.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>{staffMember.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.filter((status) => status !== "ALL").map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading calendar jobs...</Alert>
      ) : (
      <div className="interactive-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={events}
          eventClick={(info) => openJobModal(info.event.extendedProps)}
          eventClassNames="cursor-pointer"
        />
      </div>
      )}
      <Modal
        open={Boolean(selectedJob)}
        title={selectedJob ? `${selectedJob.customer.name} Job` : "Job Details"}
        onClose={() => setSelectedJob(null)}
      >
        {selectedJob && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">Status</span>
              <StatusBadge status={selectedJob.status} />
            </div>
            <div className="interactive-card rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Update Status</span>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="RESCHEDULED">RESCHEDULED</option>
                </select>
              </label>
              {selectedStatus === "RESCHEDULED" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">New Date</span>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(event) => setRescheduleDate(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">New Time</span>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(event) => setRescheduleTime(event.target.value)}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                  </label>
                </div>
              )}
              <Button className="mt-3 w-full" onClick={handleStatusUpdate} disabled={savingStatus}>
                {savingStatus ? "Updating..." : "Update Status"}
              </Button>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Date</dt>
                <dd className="font-medium text-slate-950">{new Date(selectedJob.date).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Time</dt>
                <dd className="font-medium text-slate-950">{selectedJob.scheduledTime}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Agent</dt>
                <dd className="font-medium text-slate-950">{displayName(selectedJob.assignedAgent)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Staff</dt>
                <dd className="font-medium text-slate-950">{displayName(selectedJob.assignedStaff)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-950">{selectedJob.customer.phone || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-slate-950">
                  {[selectedJob.customer.area, selectedJob.customer.city].filter(Boolean).join(", ") || "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}
