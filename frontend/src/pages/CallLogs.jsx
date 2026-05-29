import { useEffect, useMemo, useState } from "react";
import { createCallLog, getCallLogs, updateCallLog } from "../api/callLogService";
import { getCustomers } from "../api/customerService";
import { getUsers } from "../api/userService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import CallLogForm from "../components/CallLogForm";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Table from "../components/Table";

const responses = ["ALL", "INTERESTED", "NOT_INTERESTED", "CALL_LATER", "WRONG_NUMBER", "NO_ANSWER"];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function CallLogs() {
  const [callLogs, setCallLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ customerId: "ALL", agentId: "ALL", response: "ALL" });
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const params = {
        customerId: filters.customerId === "ALL" ? undefined : filters.customerId,
        agentId: filters.agentId === "ALL" ? undefined : filters.agentId,
        response: filters.response === "ALL" ? undefined : filters.response
      };
      const [logData, customerData, userData] = await Promise.all([
        getCallLogs(params),
        getCustomers(),
        getUsers()
      ]);
      setCallLogs(logData);
      setCustomers(customerData);
      setUsers(userData);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load call logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filters.customerId, filters.agentId, filters.response]);

  const agents = useMemo(() => users.filter((user) => user.role === "AGENT" || user.role === "ADMIN"), [users]);
  const filteredCallLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return callLogs;
    }

    return callLogs.filter((callLog) =>
      [
        callLog.customer?.name,
        callLog.customer?.phone,
        callLog.customer?.whatsapp,
        callLog.customer?.area,
        callLog.customer?.city,
        callLog.agent?.name,
        callLog.agent?.email,
        callLog.response,
        formatDate(callLog.nextCallDate),
        formatDate(callLog.createdAt),
        callLog.notes
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [callLogs, search]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditingLog(null);
    setModalOpen(true);
  }

  function openEditModal(callLog) {
    setEditingLog(callLog);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      setError("");
      if (editingLog) {
        await updateCallLog(editingLog.id, payload);
      } else {
        await createCallLog(payload);
      }
      setModalOpen(false);
      setEditingLog(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save call log");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Call Logs"
        description="Record customer call outcomes, next call dates, and agent notes."
        action={<Button onClick={openCreateModal}>Add Call Log</Button>}
      />
      <div className="interactive-card mb-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Customer</span>
          <select value={filters.customerId} onChange={(event) => updateFilter("customerId", event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200">
            <option value="ALL">ALL</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Agent</span>
          <select value={filters.agentId} onChange={(event) => updateFilter("agentId", event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200">
            <option value="ALL">ALL</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Response</span>
          <select value={filters.response} onChange={(event) => updateFilter("response", event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200">
            {responses.map((response) => <option key={response} value={response}>{response}</option>)}
          </select>
        </label>
      </div>
      <div className="mb-4 max-w-xl">
        <Input
          label="Search call logs"
          placeholder="Search by customer, agent, response, date, or notes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading call logs...</Alert>
      ) : (
        <Table
          columns={[
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "phone", label: "Phone", render: (row) => row.customer?.phone || "N/A" },
            { key: "agent", label: "Agent", render: (row) => row.agent?.name || "N/A" },
            { key: "response", label: "Response" },
            { key: "nextCallDate", label: "Next Call", render: (row) => formatDate(row.nextCallDate) },
            { key: "createdAt", label: "Logged", render: (row) => formatDate(row.createdAt) },
            { key: "createdBy", label: "Logged By", render: (row) => row.createdBy?.name || row.agent?.name || "N/A" },
            { key: "notes", label: "Notes", render: (row) => row.notes || "N/A" },
            { key: "actions", label: "Actions", render: (row) => <Button className="min-h-9 px-3" variant="secondary" onClick={() => openEditModal(row)}>Edit</Button> }
          ]}
          rows={filteredCallLogs}
          emptyMessage="No call logs found"
        />
      )}
      <Modal
        open={modalOpen}
        title={editingLog ? "Edit Call Log" : "Add Call Log"}
        onClose={() => setModalOpen(false)}
      >
        <CallLogForm
          customers={customers}
          users={users}
          callLog={editingLog}
          loading={saving}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </>
  );
}
