import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvoice } from "../api/invoiceService";
import { createPayment } from "../api/paymentService";
import Alert from "../components/Alert";
import Button from "../components/Button";
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

export default function InvoiceDetails() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    notes: ""
  });

  async function loadInvoice() {
    try {
      setLoading(true);
      setError("");
      const nextInvoice = await getInvoice(id);
      setInvoice(nextInvoice);
      setForm((current) => ({ ...current, amount: current.amount || String(nextInvoice.balanceAmount || nextInvoice.amount || "") }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
  }, [id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await createPayment({ ...form, invoiceId: invoice.id });
      setForm({ paymentDate: new Date().toISOString().slice(0, 10), amount: "", paymentMethod: "CASH", referenceNumber: "", notes: "" });
      await loadInvoice();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record payment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Alert type="info">Loading invoice...</Alert>;
  }

  if (!invoice) {
    return <Alert>{error || "Invoice not found"}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description="Contract billing invoice"
        action={<Link to="/invoices"><Button variant="secondary">Back</Button></Link>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div><div className="text-xs text-slate-500">Customer</div><div className="font-semibold">{invoice.customer?.name}</div></div>
          <div><div className="text-xs text-slate-500">Contract</div><div>{invoice.contract?.contractNumber || "N/A"}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusBadge status={invoice.status} /></div>
          <div><div className="text-xs text-slate-500">Invoice date</div><div>{formatDate(invoice.invoiceDate)}</div></div>
          <div><div className="text-xs text-slate-500">Due date</div><div>{formatDate(invoice.dueDate)}</div></div>
          <div><div className="text-xs text-slate-500">Amount</div><div>{formatAmount(invoice.amount)}</div></div>
          <div><div className="text-xs text-slate-500">Paid</div><div>{formatAmount(invoice.paidAmount)}</div></div>
          <div><div className="text-xs text-slate-500">Balance</div><div>{formatAmount(invoice.balanceAmount)}</div></div>
          <div><div className="text-xs text-slate-500">Payment</div><StatusBadge status={invoice.paymentStatus} /></div>
        </div>
        {invoice.notes && <p className="mt-4 text-sm text-slate-600">{invoice.notes}</p>}
      </section>
      {Number(invoice.balanceAmount || 0) > 0 && invoice.status !== "CANCELLED" && (
        <form className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
          <h2 className="text-base font-semibold text-slate-950">Record Payment</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Payment date" type="date" value={form.paymentDate} onChange={(event) => updateField("paymentDate", event.target.value)} required />
            <Input label="Amount" type="number" min="1" max={invoice.balanceAmount || invoice.amount} step="0.01" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} required />
            <label className="block text-sm font-medium text-slate-700">
              Payment method
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)}>
                {["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "ONLINE", "OTHER"].map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            <Input label="Reference number" value={form.referenceNumber} onChange={(event) => updateField("referenceNumber", event.target.value)} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          <Button type="submit" disabled={saving}>{saving ? "Recording..." : "Record Payment"}</Button>
        </form>
      )}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Payment History</h2>
        <Table
          columns={[
            { key: "paymentNumber", label: "Payment", render: (row) => row.paymentNumber || row.invoiceNumber },
            { key: "paymentDate", label: "Date", render: (row) => formatDate(row.paymentDate) },
            { key: "amount", label: "Amount", render: (row) => formatAmount(row.amount || row.paidAmount) },
            { key: "paymentMethod", label: "Method" },
            { key: "referenceNumber", label: "Reference", render: (row) => row.referenceNumber || "N/A" },
            { key: "receivedBy", label: "Received By", render: (row) => row.receivedBy?.name || row.createdBy?.name || "N/A" },
            { key: "paymentStatus", label: "Status", render: (row) => <StatusBadge status={row.paymentStatus} /> }
          ]}
          rows={invoice.payments || []}
          emptyMessage="No payments recorded"
        />
      </section>
    </>
  );
}
