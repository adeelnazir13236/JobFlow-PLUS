import { useEffect, useState } from "react";
import { getOrganizations } from "../api/organizationService";
import { createBillingInvoice, generateDueBillingInvoices, getBillingInvoices, getBillingSummary, recordOrganizationBillingPayment, updateBillingInvoiceStatus } from "../api/organizationBillingService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const invoiceFormDefaults = { organizationId: "", billingCycle: "MONTHLY", periodStart: "", dueDate: "", amount: "", notes: "" };
const paymentFormDefaults = { amount: "", paymentMethod: "BANK_TRANSFER", paymentDate: new Date().toISOString().slice(0, 10), referenceNumber: "", notes: "" };

function amount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function date(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function OrganizationBilling() {
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [filters, setFilters] = useState({ organizationId: "", status: "", billingCycle: "" });
  const [invoiceForm, setInvoiceForm] = useState(invoiceFormDefaults);
  const [paymentForm, setPaymentForm] = useState(paymentFormDefaults);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(nextFilters = filters) {
    try {
      setError("");
      const [summaryData, invoiceRows, organizationRows] = await Promise.all([
        getBillingSummary(),
        getBillingInvoices(Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value))),
        getOrganizations()
      ]);
      setSummary(summaryData);
      setInvoices(invoiceRows);
      setOrganizations(organizationRows);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load organization billing");
    }
  }

  useEffect(() => { load(); }, []);

  function updateFilter(field, value) {
    const next = { ...filters, [field]: value };
    setFilters(next);
    load(next);
  }

  async function submitInvoice(event) {
    event.preventDefault();
    try {
      setError("");
      await createBillingInvoice({
        ...invoiceForm,
        amount: invoiceForm.amount ? Number(invoiceForm.amount) : undefined
      });
      setInvoiceForm(invoiceFormDefaults);
      setInvoiceModalOpen(false);
      setMessage("Organization invoice created.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create organization invoice");
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    try {
      setError("");
      await recordOrganizationBillingPayment(paymentInvoice.id, { ...paymentForm, amount: Number(paymentForm.amount) });
      setPaymentInvoice(null);
      setPaymentForm(paymentFormDefaults);
      setMessage("Payment recorded.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record payment");
    }
  }

  async function generateDue() {
    try {
      setError("");
      const created = await generateDueBillingInvoices();
      setMessage(`${created.length} due invoice${created.length === 1 ? "" : "s"} generated.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate due invoices");
    }
  }

  async function markStatus(invoice, status) {
    try {
      setError("");
      await updateBillingInvoiceStatus(invoice.id, status);
      setMessage(`${invoice.invoiceNumber} marked ${status}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update invoice status");
    }
  }

  return (
    <>
      <PageHeader
        title="Organization Billing"
        description="Bill JOBFLOW PLUS tenant organizations for subscription usage."
        action={<div className="flex flex-wrap gap-2"><Button onClick={() => setInvoiceModalOpen(true)}>Create Invoice</Button><Button variant="secondary" onClick={generateDue}>Generate Due Invoices</Button></div>}
      />

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}

      <section className="mb-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Invoices", summary?.totalInvoices || 0],
          ["Generated", summary?.generated || 0],
          ["Paid", summary?.paid || 0],
          ["Overdue", summary?.overdue || 0],
          ["Billed", amount(summary?.totalBilled)],
          ["Outstanding", amount(summary?.outstanding)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <section className="mb-5 rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">Organization<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={filters.organizationId} onChange={(event) => updateFilter("organizationId", event.target.value)}><option value="">All organizations</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Status<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="">All statuses</option>{["GENERATED", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Billing Cycle<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={filters.billingCycle} onChange={(event) => updateFilter("billingCycle", event.target.value)}><option value="">All cycles</option>{["MONTHLY", "HALF_YEARLY", "YEARLY"].map((cycle) => <option key={cycle}>{cycle}</option>)}</select></label>
        </div>
      </section>

      <Table
        columns={[
          { key: "invoiceNumber", label: "Invoice" },
          { key: "organization", label: "Organization", render: (row) => row.organization?.name },
          { key: "plan", label: "Plan", render: (row) => row.plan?.name },
          { key: "billingCycle", label: "Cycle" },
          { key: "period", label: "Period", render: (row) => `${date(row.periodStart)} - ${date(row.periodEnd)}` },
          { key: "dueDate", label: "Due", render: (row) => date(row.dueDate) },
          { key: "amount", label: "Amount", render: (row) => amount(row.amount) },
          { key: "balanceAmount", label: "Balance", render: (row) => amount(row.balanceAmount) },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "actions", label: "Actions", render: (row) => (
            <div className="flex flex-wrap gap-2">
              {row.status !== "PAID" && row.status !== "CANCELLED" && <Button className="min-h-9 px-3" onClick={() => setPaymentInvoice(row)}>Record Payment</Button>}
              {row.status === "GENERATED" && <Button className="min-h-9 px-3" variant="secondary" onClick={() => markStatus(row, "SENT")}>Mark Sent</Button>}
              {row.status !== "CANCELLED" && row.status !== "PAID" && <Button className="min-h-9 px-3" variant="danger" onClick={() => markStatus(row, "CANCELLED")}>Cancel</Button>}
            </div>
          ) }
        ]}
        rows={invoices}
      />

      <Modal open={invoiceModalOpen} title="Create Organization Invoice" onClose={() => setInvoiceModalOpen(false)}>
        <form className="space-y-4" onSubmit={submitInvoice}>
          <label className="block text-sm font-medium text-slate-700">Organization<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={invoiceForm.organizationId} onChange={(event) => setInvoiceForm({ ...invoiceForm, organizationId: event.target.value })} required><option value="">Select organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Billing Cycle<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={invoiceForm.billingCycle} onChange={(event) => setInvoiceForm({ ...invoiceForm, billingCycle: event.target.value })}><option value="MONTHLY">MONTHLY</option><option value="HALF_YEARLY">HALF YEARLY</option><option value="YEARLY">YEARLY</option></select></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Period Start" type="date" value={invoiceForm.periodStart} onChange={(event) => setInvoiceForm({ ...invoiceForm, periodStart: event.target.value })} />
            <Input label="Due Date" type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })} />
            <Input label="Amount Override" type="number" value={invoiceForm.amount} onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })} />
          </div>
          <Input label="Notes" value={invoiceForm.notes} onChange={(event) => setInvoiceForm({ ...invoiceForm, notes: event.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setInvoiceModalOpen(false)}>Cancel</Button><Button type="submit">Create Invoice</Button></div>
        </form>
      </Modal>

      <Modal open={Boolean(paymentInvoice)} title={`Record Payment ${paymentInvoice?.invoiceNumber || ""}`} onClose={() => setPaymentInvoice(null)}>
        <form className="space-y-4" onSubmit={submitPayment}>
          <Input label="Amount" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Payment Date" type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} />
            <Input label="Reference Number" value={paymentForm.referenceNumber} onChange={(event) => setPaymentForm({ ...paymentForm, referenceNumber: event.target.value })} />
          </div>
          <label className="block text-sm font-medium text-slate-700">Payment Method<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value })}>{["BANK_TRANSFER", "CASH", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => <option key={method}>{method}</option>)}</select></label>
          <Input label="Notes" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPaymentInvoice(null)}>Cancel</Button><Button type="submit">Record Payment</Button></div>
        </form>
      </Modal>
    </>
  );
}
