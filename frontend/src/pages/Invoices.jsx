import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getInvoices } from "../api/invoiceService";
import Alert from "../components/Alert";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        setError("");
        setInvoices(await getInvoices());
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load invoices");
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return invoices;
    }

    return invoices.filter((invoice) =>
      [invoice.invoiceNumber, invoice.customer?.name, invoice.contract?.contractNumber, invoice.status, invoice.amount]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [invoices, search]);

  return (
    <>
      <PageHeader title="Invoices" description="Foundation list for contract-generated invoices." />
      <div className="mb-4 max-w-xl">
        <Input label="Search invoices" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by invoice, customer, contract, or status" />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading invoices...</Alert>
      ) : (
        <Table
          columns={[
            { key: "invoiceNumber", label: "Invoice" },
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "contract", label: "Contract", render: (row) => row.contract?.contractNumber || "N/A" },
            { key: "invoiceDate", label: "Date", render: (row) => formatDate(row.invoiceDate) },
            { key: "dueDate", label: "Due", render: (row) => formatDate(row.dueDate) },
            { key: "amount", label: "Amount", render: (row) => formatAmount(row.amount) },
            { key: "paidAmount", label: "Paid", render: (row) => formatAmount(row.paidAmount) },
            { key: "balanceAmount", label: "Balance", render: (row) => formatAmount(row.balanceAmount || row.amount) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/invoices/${row.id}`}>
                  View
                </Link>
              )
            }
          ]}
          rows={filteredInvoices}
          emptyMessage="No invoices found"
        />
      )}
    </>
  );
}
