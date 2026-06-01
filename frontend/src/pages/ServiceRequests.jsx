import { useEffect, useState } from "react";
import { convertServiceRequestToJob, getServiceRequests, updateServiceRequestStatus } from "../api/serviceRequestService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function statusLabel(status) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function ServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [convertForm, setConvertForm] = useState({ scheduledDate: "", scheduledTime: "09:00" });
  const [filters, setFilters] = useState({ status: "", priority: "", requestType: "" });
  const [error, setError] = useState("");

  async function load(next = filters) {
    try {
      setError("");
      setRequests(await getServiceRequests(Object.fromEntries(Object.entries(next).filter(([, value]) => value))));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load service requests");
    }
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(request, status) {
    try {
      setError("");
      setMessage("");
      const updated = await updateServiceRequestStatus(request.id, status);
      setSelected(updated);
      setMessage(`${request.requestNumber} marked ${statusLabel(status)}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update service request");
    }
  }

  async function convert(event) {
    event.preventDefault();
    try {
      setError("");
      setMessage("");
      const updated = await convertServiceRequestToJob(selected.id, convertForm);
      setSelected(updated);
      setConvertForm({ scheduledDate: "", scheduledTime: "09:00" });
      setMessage(`${selected.requestNumber} converted to job #${updated.relatedJobId}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to convert service request to job");
    }
  }

  function updateFilter(field, value) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    load(next);
  }

  return (
    <>
      <PageHeader title="Service Requests" description="Customer portal requests and complaints." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}

      <section className="mb-5 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["status", ["", "OPEN", "IN_REVIEW", "CONVERTED_TO_JOB", "CLOSED", "CANCELLED"]],
            ["priority", ["", "LOW", "MEDIUM", "HIGH", "URGENT"]],
            ["requestType", ["", "NEW_SERVICE", "COMPLAINT", "REVISIT", "EMERGENCY", "GENERAL"]]
          ].map(([field, options]) => (
            <label key={field} className="block text-sm font-medium text-slate-700">
              {field}
              <select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={filters[field]} onChange={(event) => updateFilter(field, event.target.value)}>
                {options.map((option) => <option key={option} value={option}>{option || "All"}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      <Table
        columns={[
          { key: "requestNumber", label: "Request" },
          { key: "customer", label: "Customer", render: (row) => row.customer?.name },
          { key: "requestType", label: "Type" },
          { key: "priority", label: "Priority" },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
          { key: "actions", label: "Actions", render: (row) => (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSelected(row)}>Open</Button>
              {!["CLOSED", "CANCELLED", "CONVERTED_TO_JOB"].includes(row.status) && (
                <>
                  <Button variant="secondary" onClick={() => changeStatus(row, "IN_REVIEW")}>Review</Button>
                  <Button variant="secondary" onClick={() => setSelected(row)}>Convert</Button>
                  <Button variant="secondary" onClick={() => changeStatus(row, "CLOSED")}>Close</Button>
                </>
              )}
            </div>
          ) }
        ]}
        rows={requests}
      />

      {selected && (
        <section className="mt-6 rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold">{selected.requestNumber}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.title}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>Close Panel</Button>
          </div>

          <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
            <div><span className="text-slate-500">Customer</span><br /><strong>{selected.customer?.name || "N/A"}</strong></div>
            <div><span className="text-slate-500">Type</span><br /><strong>{selected.requestType}</strong></div>
            <div><span className="text-slate-500">Priority</span><br /><strong>{selected.priority}</strong></div>
            <div><span className="text-slate-500">Status</span><br /><StatusBadge status={selected.status} /></div>
          </div>

          <div className="mt-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Description</p>
            <p className="mt-1 whitespace-pre-line">{selected.description}</p>
          </div>

          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>Related Contract: {selected.relatedContract?.contractNumber || "N/A"}</div>
            <div>Related Job: {selected.relatedJob ? `#${selected.relatedJob.id}` : selected.relatedJobId ? `#${selected.relatedJobId}` : "N/A"}</div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => changeStatus(selected, "IN_REVIEW")} disabled={selected.status === "IN_REVIEW" || selected.status === "CONVERTED_TO_JOB"}>Mark In Review</Button>
            <Button type="button" variant="secondary" onClick={() => changeStatus(selected, "CLOSED")} disabled={selected.status === "CLOSED" || selected.status === "CONVERTED_TO_JOB"}>Close Request</Button>
            <Button type="button" variant="secondary" onClick={() => changeStatus(selected, "CANCELLED")} disabled={selected.status === "CANCELLED" || selected.status === "CONVERTED_TO_JOB"}>Cancel Request</Button>
          </div>

          {selected.status !== "CONVERTED_TO_JOB" && (
            <form className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4" onSubmit={convert}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Convert to Job</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Scheduled date" type="date" value={convertForm.scheduledDate} onChange={(event) => setConvertForm({ ...convertForm, scheduledDate: event.target.value })} required />
                <Input label="Scheduled time" type="time" value={convertForm.scheduledTime} onChange={(event) => setConvertForm({ ...convertForm, scheduledTime: event.target.value })} required />
              </div>
              <Button className="mt-4" type="submit">Create Job</Button>
            </form>
          )}
        </section>
      )}
    </>
  );
}
