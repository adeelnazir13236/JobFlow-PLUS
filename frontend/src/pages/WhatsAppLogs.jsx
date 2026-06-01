import { useEffect, useState } from "react";
import { getWhatsAppLogs } from "../api/whatsappService";
import Alert from "../components/Alert";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export default function WhatsAppLogs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ status: "", templateCode: "", dateFrom: "", dateTo: "" });
  const [error, setError] = useState("");

  async function loadLogs(nextFilters = filters) {
    try {
      setError("");
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
      setLogs(await getWhatsAppLogs(params));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load WhatsApp logs");
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  function updateFilter(field, value) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    loadLogs(next);
  }

  return (
    <>
      <PageHeader title="WhatsApp Message Logs" description="Review outbound notifications and delivery results." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section className="mb-5 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All</option>
              {["PENDING", "SENT", "DELIVERED", "FAILED"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <Input label="Template" value={filters.templateCode} onChange={(event) => updateFilter("templateCode", event.target.value)} />
          <Input label="From" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          <Input label="To" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </div>
      </section>
      <Table
        columns={[
          { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
          { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
          { key: "phoneNumber", label: "Phone" },
          { key: "templateCode", label: "Template" },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "errorMessage", label: "Error", render: (row) => row.errorMessage || "N/A" }
        ]}
        rows={logs}
        emptyMessage="No WhatsApp logs found"
      />
    </>
  );
}
