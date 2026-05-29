import { useEffect, useState } from "react";
import Button from "./Button";
import Input from "./Input";

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toFormState(job) {
  return {
    customerId: job?.customerId || "",
    assignedAgentId: job?.assignedAgentId || "",
    assignedStaffId: job?.assignedStaffId || "",
    scheduledDate: formatDate(job?.scheduledDate),
    scheduledTime: job?.scheduledTime || "",
    status: job?.status || "SCHEDULED",
    remarks: job?.remarks || ""
  };
}

export default function JobForm({ customers, users, job, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(job));

  useEffect(() => {
    setForm(toFormState(job));
  }, [job]);

  const agents = users.filter((user) => user.role === "AGENT" || user.role === "ADMIN");
  const staff = users.filter((user) => user.role === "STAFF" || user.role === "ADMIN");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      customerId: Number(form.customerId),
      assignedAgentId: form.assignedAgentId ? Number(form.assignedAgentId) : null,
      assignedStaffId: form.assignedStaffId ? Number(form.assignedStaffId) : null
    });
  }

  return (
    <form onSubmit={handleSubmit} className="interactive-card grid gap-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Customer</span>
        <select
          value={form.customerId}
          onChange={(event) => updateField("customerId", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          required
        >
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Assigned Agent</span>
        <select
          value={form.assignedAgentId}
          onChange={(event) => updateField("assignedAgentId", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Unassigned</option>
          {agents.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Assigned Staff</span>
        <select
          value={form.assignedStaffId}
          onChange={(event) => updateField("assignedStaffId", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Unassigned</option>
          {staff.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </label>
      <Input
        label="Scheduled Date"
        type="date"
        value={form.scheduledDate}
        onChange={(event) => updateField("scheduledDate", event.target.value)}
        required
      />
      <Input
        label="Scheduled Time"
        type="time"
        value={form.scheduledTime}
        onChange={(event) => updateField("scheduledTime", event.target.value)}
        required
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
        <select
          value={form.status}
          onChange={(event) => updateField("status", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="RESCHEDULED">RESCHEDULED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </label>
      <label className="block lg:col-span-2">
        <span className="mb-1 block text-sm font-medium text-slate-700">Remarks</span>
        <textarea
          value={form.remarks}
          onChange={(event) => updateField("remarks", event.target.value)}
          className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
      </label>
      <div className="flex justify-end gap-3 lg:col-span-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Job"}</Button>
      </div>
    </form>
  );
}
