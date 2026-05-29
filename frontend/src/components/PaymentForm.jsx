import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import Input from "./Input";

const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "JAZZCASH", "EASYPAISA", "OTHER"];
const paymentStatuses = ["PENDING", "PARTIAL_PAID", "PAID", "CANCELLED", "REFUNDED"];

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toFormState(payment, defaultCustomerId = "", defaultJobId = "") {
  return {
    customerId: payment?.customerId || defaultCustomerId || "",
    jobId: payment?.jobId || defaultJobId || "",
    totalAmount: payment?.totalAmount || "",
    paidAmount: payment?.paidAmount || "",
    paymentMethod: payment?.paymentMethod || "CASH",
    paymentStatus: payment?.paymentStatus || "PENDING",
    paymentDate: formatDate(payment?.paymentDate),
    remarks: payment?.remarks || ""
  };
}

export default function PaymentForm({
  customers,
  jobs,
  payment,
  loading,
  defaultCustomerId,
  defaultJobId,
  onCancel,
  onSubmit
}) {
  const [form, setForm] = useState(() => toFormState(payment, defaultCustomerId, defaultJobId));

  useEffect(() => {
    setForm(toFormState(payment, defaultCustomerId, defaultJobId));
  }, [payment, defaultCustomerId, defaultJobId]);

  const completedJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesCustomer = form.customerId ? Number(form.customerId) === job.customerId : true;
      const hasExistingPayment = job.payments?.length > 0;
      const isCurrentPaymentJob = payment?.jobId === job.id;

      return job.status === "COMPLETED" && matchesCustomer && (!hasExistingPayment || isCurrentPaymentJob);
    });
  }, [form.customerId, jobs, payment?.jobId]);

  const balanceAmount = Math.max(Number(form.totalAmount || 0) - Number(form.paidAmount || 0), 0);

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "customerId") {
        next.jobId = "";
      }

      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      customerId: Number(form.customerId),
      jobId: Number(form.jobId),
      totalAmount: Number(form.totalAmount),
      paidAmount: Number(form.paidAmount || 0),
      paymentDate: form.paymentDate || null
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
        <span className="mb-1 block text-sm font-medium text-slate-700">Completed Job</span>
        <select
          value={form.jobId}
          onChange={(event) => updateField("jobId", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          required
        >
          <option value="">Select completed job</option>
          {completedJobs.map((job) => (
            <option key={job.id} value={job.id}>
              #{job.id} - {new Date(job.scheduledDate).toLocaleDateString()} {job.scheduledTime}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Total Amount"
        type="number"
        min="0"
        step="0.01"
        value={form.totalAmount}
        onChange={(event) => updateField("totalAmount", event.target.value)}
        required
      />
      <Input
        label="Paid Amount"
        type="number"
        min="0"
        step="0.01"
        value={form.paidAmount}
        onChange={(event) => updateField("paidAmount", event.target.value)}
      />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Payment Method</span>
        <select
          value={form.paymentMethod}
          onChange={(event) => updateField("paymentMethod", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          {paymentMethods.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Payment Status</span>
        <select
          value={form.paymentStatus}
          onChange={(event) => updateField("paymentStatus", event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <Input
        label="Payment Date"
        type="date"
        value={form.paymentDate}
        onChange={(event) => updateField("paymentDate", event.target.value)}
      />
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Balance Amount</span>
        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-950">
          {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
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
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Payment"}</Button>
      </div>
    </form>
  );
}
