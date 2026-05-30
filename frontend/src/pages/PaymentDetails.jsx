import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPayment } from "../api/paymentService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatUser(user) {
  return user?.name || "N/A";
}

export default function PaymentDetails() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPayment() {
      try {
        setLoading(true);
        setError("");
        setPayment(await getPayment(id));
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load payment details");
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [id]);

  if (loading) {
    return <Alert type="info">Loading payment details...</Alert>;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (!payment) {
    return <Alert>Payment not found</Alert>;
  }

  return (
    <>
      <PageHeader
        title={payment.paymentNumber || payment.invoiceNumber || `Payment #${payment.id}`}
        description={payment.invoiceId ? `${payment.customer?.name || "Customer"} - ${payment.invoice?.invoiceNumber}` : `${payment.customer?.name || "Customer"} - Job #${payment.jobId}`}
        action={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.print()}>Print Invoice</Button>
            {!payment.invoiceId && (
              <Link to={`/payments/${payment.id}/edit`}>
                <Button>Edit Payment</Button>
              </Link>
            )}
          </div>
        }
      />
      <section className="invoice-print interactive-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="JobFlow" className="h-12 w-12 object-contain" />
              <div>
                <div className="text-2xl font-bold text-[var(--brand-navy)]">JobFlow</div>
                <div className="text-sm text-slate-500">Payment Receipt / Invoice</div>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm font-medium text-slate-500">Payment Number</div>
            <div className="text-2xl font-semibold text-slate-950">{payment.paymentNumber || payment.invoiceNumber || `PAY-${String(payment.id).padStart(6, "0")}`}</div>
            <div className="mt-2"><StatusBadge status={payment.paymentStatus} /></div>
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bill To</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">Customer</dt><dd className="font-medium text-slate-950">{payment.customer?.name || "N/A"}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-950">{payment.customer?.phone || "N/A"}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-950">{payment.customer?.email || "N/A"}</dd></div>
              <div><dt className="text-slate-500">Address</dt><dd className="font-medium text-slate-950">{payment.customer?.address || [payment.customer?.area, payment.customer?.city].filter(Boolean).join(", ") || "N/A"}</dd></div>
            </dl>
          </section>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{payment.invoiceId ? "Invoice & Payment" : "Job & Payment"}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">Invoice</dt><dd className="font-medium text-slate-950">{payment.invoice?.invoiceNumber || "N/A"}</dd></div>
              <div><dt className="text-slate-500">Contract</dt><dd className="font-medium text-slate-950">{payment.contract?.contractNumber || "N/A"}</dd></div>
              <div><dt className="text-slate-500">Job</dt><dd className="font-medium text-slate-950">{payment.jobId ? `#${payment.jobId}` : "N/A"}</dd></div>
              <div><dt className="text-slate-500">Job Date</dt><dd className="font-medium text-slate-950">{formatDate(payment.job?.scheduledDate)}</dd></div>
              <div><dt className="text-slate-500">Payment Date</dt><dd className="font-medium text-slate-950">{formatDate(payment.paymentDate)}</dd></div>
              <div><dt className="text-slate-500">Method</dt><dd className="font-medium text-slate-950">{payment.paymentMethod}</dd></div>
              <div><dt className="text-slate-500">Reference</dt><dd className="font-medium text-slate-950">{payment.referenceNumber || "N/A"}</dd></div>
              <div><dt className="text-slate-500">Received By</dt><dd className="font-medium text-slate-950">{formatUser(payment.receivedBy)}</dd></div>
              <div><dt className="text-slate-500">Created By</dt><dd className="font-medium text-slate-950">{formatUser(payment.createdBy)}</dd></div>
              <div><dt className="text-slate-500">Updated By</dt><dd className="font-medium text-slate-950">{formatUser(payment.updatedBy)}</dd></div>
            </dl>
          </section>
        </div>

        <div className="py-6">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-700">{payment.invoiceId ? `Payment against invoice ${payment.invoice?.invoiceNumber}` : `Job service charges for Job #${payment.jobId}`}</td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-slate-950">{formatAmount(payment.amount || payment.paidAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <dl className="ml-auto mt-5 max-w-sm space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Total Amount</dt><dd className="font-semibold text-slate-950">{formatAmount(payment.totalAmount)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Paid Amount</dt><dd className="font-semibold text-slate-950">{formatAmount(payment.amount || payment.paidAmount)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3"><dt className="font-semibold text-slate-950">Balance Amount</dt><dd className="text-xl font-bold text-slate-950">{formatAmount(payment.balanceAmount)}</dd></div>
          </dl>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-500">Remarks</dt>
          <dd className="mt-2 text-sm font-medium text-slate-950">{payment.remarks || "N/A"}</dd>
        </div>
      </section>
    </>
  );
}
