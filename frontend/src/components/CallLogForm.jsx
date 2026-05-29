import { useEffect, useState } from "react";
import Button from "./Button";

const responses = ["INTERESTED", "NOT_INTERESTED", "CALL_LATER", "WRONG_NUMBER", "NO_ANSWER"];

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export default function CallLogForm({
  customers,
  users = [],
  callLog,
  customerId,
  loading,
  onCancel,
  onSubmit
}) {
  const [form, setForm] = useState({
    customerId: customerId || "",
    agentId: "",
    response: "INTERESTED",
    notes: "",
    nextCallDate: ""
  });

  useEffect(() => {
    setForm({
      customerId: callLog?.customerId || customerId || "",
      agentId: callLog?.agentId || "",
      response: callLog?.response || "INTERESTED",
      notes: callLog?.notes || "",
      nextCallDate: formatDate(callLog?.nextCallDate)
    });
  }, [callLog, customerId]);

  const agents = users.filter((user) => user.role === "AGENT" || user.role === "ADMIN");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      customerId: Number(form.customerId),
      agentId: form.agentId ? Number(form.agentId) : undefined,
      response: form.response,
      notes: form.notes,
      nextCallDate: form.nextCallDate || undefined
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Customer</span>
        <select
          value={form.customerId}
          onChange={(event) => updateField("customerId", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          required
          disabled={Boolean(customerId)}
        >
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Agent</span>
        <select
          value={form.agentId}
          onChange={(event) => updateField("agentId", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Current logged-in user</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Response</span>
        <select
          value={form.response}
          onChange={(event) => updateField("response", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          {responses.map((response) => (
            <option key={response} value={response}>{response}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Next Call Date</span>
        <input
          type="date"
          value={form.nextCallDate}
          onChange={(event) => updateField("nextCallDate", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        />
      </label>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Call Log"}</Button>
      </div>
    </form>
  );
}
