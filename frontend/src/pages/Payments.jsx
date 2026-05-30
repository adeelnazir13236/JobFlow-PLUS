import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deletePayment, getPayments } from "../api/paymentService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const statuses = ["ALL", "PENDING", "PARTIAL_PAID", "PARTIALLY_PAID", "PAID", "CANCELLED", "REFUNDED"];

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");
      setPayments(await getPayments());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesStatus = activeStatus === "ALL" || payment.paymentStatus === activeStatus;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        payment.customer?.name,
        payment.customer?.phone,
        payment.customer?.area,
        payment.customer?.city,
        payment.paymentNumber,
        payment.invoiceNumber,
        payment.invoice?.invoiceNumber,
        payment.contract?.contractNumber,
        `#${payment.jobId}`,
        payment.totalAmount,
        payment.amount,
        payment.paidAmount,
        payment.balanceAmount,
        payment.paymentMethod,
        payment.paymentStatus,
        formatDate(payment.paymentDate),
        payment.remarks
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeStatus, payments, search]);

  async function handleDelete(payment) {
    if (!window.confirm("Delete this payment record?")) {
      return;
    }

    try {
      setActionLoadingId(payment.id);
      setError("");
      await deletePayment(payment.id);
      await loadPayments();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete payment");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Payments"
        description="Track job payments and manual payments received against contract invoices."
        action={
          <Link to="/payments/add">
            <Button>Add Payment</Button>
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
          label="Search payments"
          placeholder="Search by customer, job, amount, method, status, or remarks"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading payments...</Alert>
      ) : (
        <Table
          columns={[
            { key: "paymentNumber", label: "Payment", render: (row) => row.paymentNumber || row.invoiceNumber || `PAY-${String(row.id).padStart(6, "0")}` },
            { key: "invoice", label: "Invoice", render: (row) => row.invoice?.invoiceNumber || (row.jobId ? row.invoiceNumber : "N/A") },
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "contract", label: "Contract", render: (row) => row.contract?.contractNumber || "N/A" },
            { key: "job", label: "Job", render: (row) => row.jobId ? `#${row.jobId}` : "N/A" },
            { key: "totalAmount", label: "Total", render: (row) => formatAmount(row.totalAmount) },
            { key: "paidAmount", label: "Paid", render: (row) => formatAmount(row.amount || row.paidAmount) },
            { key: "balanceAmount", label: "Balance", render: (row) => formatAmount(row.balanceAmount) },
            { key: "paymentMethod", label: "Method" },
            { key: "paymentDate", label: "Date", render: (row) => formatDate(row.paymentDate) },
            { key: "createdBy", label: "Created By", render: (row) => row.createdBy?.name || "N/A" },
            { key: "paymentStatus", label: "Status", render: (row) => <StatusBadge status={row.paymentStatus} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/payments/${row.id}`}>
                    View
                  </Link>
                  {!row.invoiceId && (
                    <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/payments/${row.id}/edit`}>
                      Edit
                    </Link>
                  )}
                  <Button className="min-h-9 px-3" variant="danger" onClick={() => handleDelete(row)} disabled={actionLoadingId === row.id}>
                    {actionLoadingId === row.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              )
            }
          ]}
          rows={filteredPayments}
          emptyMessage={`No ${activeStatus.toLowerCase()} payments found`}
        />
      )}
    </>
  );
}
