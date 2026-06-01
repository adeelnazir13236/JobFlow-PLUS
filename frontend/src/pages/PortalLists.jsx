import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  approvePortalQuotation,
  createPortalServiceRequest,
  getPortalContract,
  getPortalContracts,
  getPortalInvoice,
  getPortalInvoicePdf,
  getPortalInvoices,
  getPortalJob,
  getPortalJobs,
  getPortalPayment,
  getPortalPaymentReceipt,
  getPortalPayments,
  getPortalQuotation,
  getPortalQuotationPdf,
  getPortalQuotations,
  getPortalServiceRequest,
  getPortalServiceRequests,
  rejectPortalQuotation
} from "../api/portalApi";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import Table from "../components/Table";
import { openPdfBlob } from "../utils/pdf";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      setError("");
      setData(await loader());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load data");
    }
  }
  useEffect(() => { load(); }, deps);
  return { data, error, reload: load };
}

export function PortalQuotations() {
  const { data, error } = useLoad(getPortalQuotations);
  if (error) return <Alert>{error}</Alert>;
  return <>
    <PageHeader title="Quotations" description="Review estimates and approvals." />
    <Table columns={[
      { key: "quotationNumber", label: "Quotation", render: (row) => <Link to={`/portal/quotations/${row.id}`}>{row.quotationNumber}</Link> },
      { key: "quotationDate", label: "Date", render: (row) => formatDate(row.quotationDate) },
      { key: "validUntil", label: "Valid Until", render: (row) => formatDate(row.validUntil) },
      { key: "status", label: "Status" },
      { key: "totalAmount", label: "Total", render: (row) => formatAmount(row.totalAmount) }
    ]} rows={data || []} />
  </>;
}

export function PortalQuotationDetail() {
  const { id } = useParams();
  const { data: quotation, error, reload } = useLoad(() => getPortalQuotation(id), [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!quotation) return <Alert type="info">Loading quotation...</Alert>;
  async function action(fn) { await fn(id); await reload(); }
  return <>
    <PageHeader title={quotation.quotationNumber} description={quotation.title} action={<Button variant="secondary" onClick={() => openPdfBlobFrom(getPortalQuotationPdf(id))}>Download PDF</Button>} />
    <section className="mb-5 rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div>Status: <strong>{quotation.status}</strong></div>
        <div>Date: {formatDate(quotation.quotationDate)}</div>
        <div>Valid: {formatDate(quotation.validUntil)}</div>
        <div>Total: {formatAmount(quotation.totalAmount)}</div>
      </div>
      {["DRAFT", "SENT"].includes(quotation.status) && (
        <div className="mt-4 flex gap-2">
          <Button onClick={() => action(approvePortalQuotation)}>Approve</Button>
          <Button variant="danger" onClick={() => action(rejectPortalQuotation)}>Reject</Button>
        </div>
      )}
    </section>
    <Table columns={[
      { key: "itemName", label: "Item" },
      { key: "description", label: "Description", render: (row) => row.description || "N/A" },
      { key: "quantity", label: "Qty" },
      { key: "unitPrice", label: "Unit Price", render: (row) => formatAmount(row.unitPrice) },
      { key: "lineTotal", label: "Total", render: (row) => formatAmount(row.lineTotal) }
    ]} rows={quotation.items || []} />
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-700">
      <p><strong>Notes:</strong> {quotation.notes || "N/A"}</p>
      <p className="mt-2"><strong>Terms:</strong> {quotation.terms || "N/A"}</p>
    </div>
  </>;
}

async function openPdfBlobFrom(promise) {
  openPdfBlob(await promise);
}

export function PortalContracts() {
  const { data, error } = useLoad(getPortalContracts);
  if (error) return <Alert>{error}</Alert>;
  return <><PageHeader title="Contracts" description="Your active and past contracts." /><Table columns={[
    { key: "contractNumber", label: "Contract", render: (row) => <Link to={`/portal/contracts/${row.id}`}>{row.contractNumber}</Link> },
    { key: "title", label: "Title" },
    { key: "startDate", label: "Start", render: (row) => formatDate(row.startDate) },
    { key: "endDate", label: "End", render: (row) => formatDate(row.endDate) },
    { key: "status", label: "Status" }
  ]} rows={data || []} /></>;
}

export function PortalContractDetail() {
  const { id } = useParams();
  const { data: contract, error } = useLoad(() => getPortalContract(id), [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!contract) return <Alert type="info">Loading contract...</Alert>;
  return <><PageHeader title={contract.contractNumber} description={contract.title} /><Table columns={[
    { key: "serviceName", label: "Service" },
    { key: "frequencyType", label: "Frequency", render: (row) => `${row.frequencyInterval} ${row.frequencyType}` },
    { key: "completedJobs", label: "Progress", render: (row) => `${row.completedJobs}/${row.totalJobs}` },
    { key: "status", label: "Status" }
  ]} rows={contract.services || []} /></>;
}

export function PortalJobs() {
  const { data, error } = useLoad(getPortalJobs);
  if (error) return <Alert>{error}</Alert>;
  return <><PageHeader title="Jobs" description="Your scheduled and completed service visits." /><Table columns={[
    { key: "id", label: "Job", render: (row) => <Link to={`/portal/jobs/${row.id}`}>#{row.id}</Link> },
    { key: "scheduledDate", label: "Date", render: (row) => formatDate(row.scheduledDate) },
    { key: "scheduledTime", label: "Time" },
    { key: "status", label: "Status" }
  ]} rows={data || []} /></>;
}

export function PortalJobDetail() {
  const { id } = useParams();
  const { data: job, error } = useLoad(() => getPortalJob(id), [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!job) return <Alert type="info">Loading job...</Alert>;
  return <><PageHeader title={`Job #${job.id}`} description={`${formatDate(job.scheduledDate)} ${job.scheduledTime}`} /><section className="rounded-md border border-slate-200 bg-white p-5">Status: <strong>{job.status}</strong><br />Assigned: {job.assignedStaff?.name || "Team"}<br />Remarks: {job.remarks || "N/A"}</section></>;
}

export function PortalInvoices() {
  const { data, error } = useLoad(getPortalInvoices);
  if (error) return <Alert>{error}</Alert>;
  return <><PageHeader title="Invoices" description="Your invoice history." /><Table columns={[
    { key: "invoiceNumber", label: "Invoice", render: (row) => <Link to={`/portal/invoices/${row.id}`}>{row.invoiceNumber}</Link> },
    { key: "invoiceDate", label: "Date", render: (row) => formatDate(row.invoiceDate) },
    { key: "amount", label: "Amount", render: (row) => formatAmount(row.amount) },
    { key: "balanceAmount", label: "Balance", render: (row) => formatAmount(row.balanceAmount) },
    { key: "status", label: "Status" }
  ]} rows={data || []} /></>;
}

export function PortalInvoiceDetail() {
  const { id } = useParams();
  const { data: invoice, error } = useLoad(() => getPortalInvoice(id), [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!invoice) return <Alert type="info">Loading invoice...</Alert>;
  return <><PageHeader title={invoice.invoiceNumber} description="Invoice detail" action={<Button variant="secondary" onClick={() => openPdfBlobFrom(getPortalInvoicePdf(id))}>Download PDF</Button>} /><section className="rounded-md border border-slate-200 bg-white p-5">Amount: {formatAmount(invoice.amount)}<br />Paid: {formatAmount(invoice.paidAmount)}<br />Balance: {formatAmount(invoice.balanceAmount)}<br />Status: {invoice.status}</section></>;
}

export function PortalPayments() {
  const { data, error } = useLoad(getPortalPayments);
  if (error) return <Alert>{error}</Alert>;
  return <><PageHeader title="Payments" description="Your payment receipts." /><Table columns={[
    { key: "paymentNumber", label: "Payment", render: (row) => <Link to={`/portal/payments/${row.id}`}>{row.paymentNumber || row.invoiceNumber}</Link> },
    { key: "paymentDate", label: "Date", render: (row) => formatDate(row.paymentDate) },
    { key: "amount", label: "Amount", render: (row) => formatAmount(row.amount || row.paidAmount) },
    { key: "paymentMethod", label: "Method" }
  ]} rows={data || []} /></>;
}

export function PortalPaymentDetail() {
  const { id } = useParams();
  const { data: payment, error } = useLoad(() => getPortalPayment(id), [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!payment) return <Alert type="info">Loading payment...</Alert>;
  return <><PageHeader title={payment.paymentNumber || payment.invoiceNumber} description="Payment receipt" action={<Button variant="secondary" onClick={() => openPdfBlobFrom(getPortalPaymentReceipt(id))}>Download Receipt</Button>} /><section className="rounded-md border border-slate-200 bg-white p-5">Amount: {formatAmount(payment.amount || payment.paidAmount)}<br />Method: {payment.paymentMethod}<br />Reference: {payment.referenceNumber || "N/A"}</section></>;
}

export function PortalServiceRequests() {
  const { data, error, reload } = useLoad(getPortalServiceRequests);
  const [form, setForm] = useState({ requestType: "GENERAL", priority: "MEDIUM", title: "", description: "", relatedContractId: "", relatedJobId: "" });
  async function submit(event) {
    event.preventDefault();
    await createPortalServiceRequest({ ...form, relatedContractId: form.relatedContractId || undefined, relatedJobId: form.relatedJobId || undefined });
    setForm({ requestType: "GENERAL", priority: "MEDIUM", title: "", description: "", relatedContractId: "", relatedJobId: "" });
    await reload();
  }
  if (error) return <Alert>{error}</Alert>;
  return <>
    <PageHeader title="Service Requests" description="Raise a new request or complaint." />
    <form className="mb-6 rounded-md border border-slate-200 bg-white p-5" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Type<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })}>{["NEW_SERVICE", "COMPLAINT", "REVISIT", "EMERGENCY", "GENERAL"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block text-sm font-medium text-slate-700">Priority<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Input label="Related Job ID" value={form.relatedJobId} onChange={(e) => setForm({ ...form, relatedJobId: e.target.value })} />
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">Description<textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
      </div>
      <Button className="mt-4" type="submit">Create Request</Button>
    </form>
    <Table columns={[
      { key: "requestNumber", label: "Request", render: (row) => <Link to={`/portal/service-requests/${row.id}`}>{row.requestNumber}</Link> },
      { key: "requestType", label: "Type" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) }
    ]} rows={data || []} />
  </>;
}

export function PortalServiceRequestDetail() {
  const { id } = useParams();
  const { data: request, error } = useLoad(() => getPortalServiceRequest(id), [id]);
  if (error) return <Alert>{error}</Alert>;
  if (!request) return <Alert type="info">Loading service request...</Alert>;

  return <>
    <PageHeader title={request.requestNumber} description={request.title} />
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div><span className="text-sm text-slate-500">Type</span><br /><strong>{request.requestType}</strong></div>
        <div><span className="text-sm text-slate-500">Priority</span><br /><strong>{request.priority}</strong></div>
        <div><span className="text-sm text-slate-500">Status</span><br /><strong>{request.status}</strong></div>
        <div><span className="text-sm text-slate-500">Created</span><br /><strong>{formatDate(request.createdAt)}</strong></div>
      </div>
      <div className="mt-5 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Description</p>
        <p className="mt-1 whitespace-pre-line">{request.description}</p>
      </div>
      <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
        <div>Related Contract: {request.relatedContract?.contractNumber || "N/A"}</div>
        <div>Related Job: {request.relatedJob ? `#${request.relatedJob.id}` : "N/A"}</div>
      </div>
    </section>
  </>;
}
