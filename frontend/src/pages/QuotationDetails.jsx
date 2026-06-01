import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { convertQuotationToContract, convertQuotationToJob, getQuotation, getQuotationPdf, updateQuotationStatus } from "../api/quotationService";
import { getWhatsAppLogs, sendQuotationWhatsApp } from "../api/whatsappService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";
import { openPdfBlob } from "../utils/pdf";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuotationDetails() {
  const { id } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const canUseWhatsApp = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.features?.includes("WHATSAPP");
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);

  async function loadQuotation() {
    try {
      setLoading(true);
      setError("");
      setQuotation(await getQuotation(id));
      if (canUseWhatsApp) {
        setLogs(await getWhatsAppLogs({ quotationId: id }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load quotation");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotation();
  }, [id]);

  async function runAction(action) {
    try {
      setSaving(true);
      setError("");
      await action();
      await loadQuotation();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  }

  async function openPdf() {
    try {
      setError("");
      openPdfBlob(await getQuotationPdf(id));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to open quotation PDF");
    }
  }

  async function sendWhatsApp() {
    await runAction(() => sendQuotationWhatsApp(id));
  }

  if (loading) {
    return <Alert type="info">Loading quotation...</Alert>;
  }

  if (!quotation) {
    return <Alert>{error || "Quotation not found"}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={quotation.quotationNumber}
        description={quotation.title}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/quotations"><Button variant="secondary">Back</Button></Link>
            <Button variant="secondary" onClick={openPdf}>Download PDF</Button>
            <Button variant="secondary" onClick={openPdf}>Print PDF</Button>
            {canUseWhatsApp && <Button variant="secondary" disabled={saving} onClick={sendWhatsApp}>Send WhatsApp</Button>}
            <Link to={`/quotations/${quotation.id}/edit`}><Button>Edit</Button></Link>
          </div>
        }
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section className="mb-6 rounded-md border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div><div className="text-xs text-slate-500">Customer</div><div className="font-semibold">{quotation.customer?.name}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusBadge status={quotation.status} /></div>
          <div><div className="text-xs text-slate-500">Date</div><div>{formatDate(quotation.quotationDate)}</div></div>
          <div><div className="text-xs text-slate-500">Valid Until</div><div>{formatDate(quotation.validUntil)}</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {quotation.status === "DRAFT" && <Button variant="secondary" disabled={saving} onClick={() => runAction(() => updateQuotationStatus(id, "SENT"))}>Mark as Sent</Button>}
          {quotation.status === "SENT" && (
            <>
              <Button variant="success" disabled={saving} onClick={() => runAction(() => updateQuotationStatus(id, "ACCEPTED"))}>Mark as Accepted</Button>
              <Button variant="danger" disabled={saving} onClick={() => runAction(() => updateQuotationStatus(id, "REJECTED"))}>Mark as Rejected</Button>
            </>
          )}
          {quotation.status === "ACCEPTED" && (
            <>
              <Button disabled={saving} onClick={() => runAction(() => convertQuotationToJob(id))}>Convert to Job</Button>
              <Button variant="secondary" disabled={saving} onClick={() => runAction(() => convertQuotationToContract(id))}>Convert to Contract</Button>
            </>
          )}
        </div>
      </section>

      {quotation.status === "CONVERTED" && (
        <section className="mb-6 rounded-md border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Conversion</h2>
          {quotation.convertedToType === "JOB" && quotation.convertedJob && (
            <Link className="interactive-link text-[var(--brand-blue)]" to={`/jobs/${quotation.convertedJob.id}`}>
              Converted to Job #{quotation.convertedJob.id}
            </Link>
          )}
          {quotation.convertedToType === "CONTRACT" && quotation.convertedContract && (
            <Link className="interactive-link text-[var(--brand-blue)]" to={`/contracts/${quotation.convertedContract.id}`}>
              Converted to Contract {quotation.convertedContract.contractNumber}
            </Link>
          )}
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Items</h2>
        <Table
          columns={[
            { key: "itemName", label: "Item" },
            { key: "description", label: "Description", render: (row) => row.description || "N/A" },
            { key: "quantity", label: "Qty", render: (row) => Number(row.quantity || 0).toLocaleString() },
            { key: "unitPrice", label: "Unit Price", render: (row) => formatAmount(row.unitPrice) },
            { key: "lineTotal", label: "Line Total", render: (row) => formatAmount(row.lineTotal) }
          ]}
          rows={quotation.items || []}
          emptyMessage="No quotation items"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
          <div><div className="text-xs text-slate-500">Description</div><p className="mt-1 text-sm text-slate-700">{quotation.description || "N/A"}</p></div>
          <div><div className="text-xs text-slate-500">Notes</div><p className="mt-1 text-sm text-slate-700">{quotation.notes || "N/A"}</p></div>
          <div><div className="text-xs text-slate-500">Terms</div><p className="mt-1 text-sm text-slate-700">{quotation.terms || "N/A"}</p></div>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-950">Totals</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-semibold">{formatAmount(quotation.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-semibold">{formatAmount(quotation.discountAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-semibold">{formatAmount(quotation.taxAmount)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-bold">{formatAmount(quotation.totalAmount)}</dd></div>
          </dl>
        </div>
      </section>

      {canUseWhatsApp && <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-slate-950">WhatsApp History</h2>
        <Table
          columns={[
            { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
            { key: "templateCode", label: "Template" },
            { key: "phoneNumber", label: "Phone" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "errorMessage", label: "Error", render: (row) => row.errorMessage || "N/A" }
          ]}
          rows={logs}
          emptyMessage="No WhatsApp messages for this quotation"
        />
      </section>}
    </>
  );
}
