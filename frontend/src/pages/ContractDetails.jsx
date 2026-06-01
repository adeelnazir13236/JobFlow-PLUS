import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { activateContract, addBillingRule, addContractService, cancelContract, getContract, pauseContract } from "../api/contractService";
import { getWhatsAppLogs, sendContractWhatsApp } from "../api/whatsappService";
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

export default function ContractDetails() {
  const { id } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const canUseWhatsApp = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.features?.includes("WHATSAPP");
  const [contract, setContract] = useState(null);
  const [serviceForm, setServiceForm] = useState({ serviceName: "", frequencyType: "MONTHLY", frequencyInterval: 1, totalJobs: "", nextJobDate: "", preferredTime: "09:00" });
  const [billingForm, setBillingForm] = useState({ billingType: "MONTHLY", billingCycle: "MONTHLY", invoiceAfterCompletedJobs: "", invoiceAmount: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);

  async function loadContract() {
    try {
      setLoading(true);
      setError("");
      setContract(await getContract(id));
      if (canUseWhatsApp) {
        setLogs(await getWhatsAppLogs({ contractId: id }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load contract");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContract();
  }, [id]);

  function updateService(field, value) {
    setServiceForm((current) => ({ ...current, [field]: value }));
  }

  function updateBilling(field, value) {
    setBillingForm((current) => ({ ...current, [field]: value }));
  }

  async function runAction(action) {
    try {
      setSaving(true);
      setError("");
      await action();
      await loadContract();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleServiceSubmit(event) {
    event.preventDefault();
    await runAction(() => addContractService(id, serviceForm));
    setServiceForm({ serviceName: "", frequencyType: "MONTHLY", frequencyInterval: 1, totalJobs: "", nextJobDate: "", preferredTime: "09:00" });
  }

  async function handleBillingSubmit(event) {
    event.preventDefault();
    await runAction(() => addBillingRule(id, billingForm));
    setBillingForm({ billingType: "MONTHLY", billingCycle: "MONTHLY", invoiceAfterCompletedJobs: "", invoiceAmount: "" });
  }

  async function sendWhatsApp() {
    await runAction(async () => {
      await sendContractWhatsApp(id);
      setLogs(await getWhatsAppLogs({ contractId: id }));
    });
  }

  if (loading) {
    return <Alert type="info">Loading contract...</Alert>;
  }

  if (!contract) {
    return <Alert>{error || "Contract not found"}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={contract.contractNumber}
        description={contract.title}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/contracts"><Button variant="secondary">Back</Button></Link>
            {canUseWhatsApp && <Button variant="secondary" disabled={saving} onClick={sendWhatsApp}>Send WhatsApp</Button>}
          </div>
        }
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section className="mb-6 rounded-md border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div><div className="text-xs text-slate-500">Customer</div><div className="font-semibold">{contract.customer?.name}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusBadge status={contract.status} /></div>
          <div><div className="text-xs text-slate-500">Dates</div><div>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</div></div>
          <div><div className="text-xs text-slate-500">Value</div><div>{formatAmount(contract.contractValue)}</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={saving || contract.status === "ACTIVE"} onClick={() => runAction(() => activateContract(id))}>Activate</Button>
          <Button variant="secondary" disabled={saving} onClick={() => runAction(() => pauseContract(id))}>Pause</Button>
          <Button variant="danger" disabled={saving} onClick={() => runAction(() => cancelContract(id))}>Cancel</Button>
        </div>
      </section>
      <section className="mb-6 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-950">Financial Summary</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div><div className="text-xs text-slate-500">Contract Value</div><div className="font-semibold">{formatAmount(contract.financialSummary?.contractValue || contract.contractValue)}</div></div>
          <div><div className="text-xs text-slate-500">Invoice Amount</div><div className="font-semibold">{formatAmount(contract.financialSummary?.totalInvoiceAmount)}</div></div>
          <div><div className="text-xs text-slate-500">Paid</div><div className="font-semibold">{formatAmount(contract.financialSummary?.totalPaidAmount)}</div></div>
          <div><div className="text-xs text-slate-500">Outstanding</div><div className="font-semibold">{formatAmount(contract.financialSummary?.totalOutstandingAmount)}</div></div>
          <div><div className="text-xs text-slate-500">Invoices</div><div>{contract.financialSummary?.invoiceCount || 0}</div></div>
          <div><div className="text-xs text-slate-500">Paid Invoices</div><div>{contract.financialSummary?.paidInvoices || 0}</div></div>
          <div><div className="text-xs text-slate-500">Partial Invoices</div><div>{contract.financialSummary?.partiallyPaidInvoices || 0}</div></div>
          <div><div className="text-xs text-slate-500">Unpaid Invoices</div><div>{contract.financialSummary?.unpaidInvoices || 0}</div></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Service Schedules</h2>
          <Table
            columns={[
              { key: "serviceName", label: "Service" },
              { key: "frequencyType", label: "Frequency", render: (row) => `${row.frequencyInterval} ${row.frequencyType}` },
              { key: "progress", label: "Progress", render: (row) => `${row.completedJobs}/${row.totalJobs}` },
              { key: "nextJobDate", label: "Next Job", render: (row) => formatDate(row.nextJobDate) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
            ]}
            rows={contract.services || []}
            emptyMessage="No service schedules added"
          />
          <form className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-4" onSubmit={handleServiceSubmit}>
            <Input label="Service name" value={serviceForm.serviceName} onChange={(event) => updateService("serviceName", event.target.value)} required />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Frequency
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={serviceForm.frequencyType} onChange={(event) => updateService("frequencyType", event.target.value)}>
                  {["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <Input label="Interval" type="number" min="1" value={serviceForm.frequencyInterval} onChange={(event) => updateService("frequencyInterval", event.target.value)} required />
              <Input label="Total jobs" type="number" min="1" value={serviceForm.totalJobs} onChange={(event) => updateService("totalJobs", event.target.value)} required />
              <Input label="First job date" type="date" value={serviceForm.nextJobDate} onChange={(event) => updateService("nextJobDate", event.target.value)} />
              <Input label="Preferred time" type="time" value={serviceForm.preferredTime} onChange={(event) => updateService("preferredTime", event.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>Add Service</Button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Billing Rules</h2>
          <Table
            columns={[
              { key: "billingType", label: "Type" },
              { key: "invoiceAfterCompletedJobs", label: "After Jobs" },
              { key: "invoiceAmount", label: "Amount", render: (row) => formatAmount(row.invoiceAmount) },
              { key: "nextInvoiceDueAfterJobs", label: "Next Due" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
            ]}
            rows={contract.billingRules || []}
            emptyMessage="No billing rules added"
          />
          <form className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-4" onSubmit={handleBillingSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Billing type
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={billingForm.billingType} onChange={(event) => updateBilling("billingType", event.target.value)}>
                  {["MONTHLY", "QUARTERLY", "YEARLY", "PER_VISIT", "CUSTOM"].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <Input label="Invoice after completed jobs" type="number" min="1" value={billingForm.invoiceAfterCompletedJobs} onChange={(event) => updateBilling("invoiceAfterCompletedJobs", event.target.value)} required />
              <Input label="Invoice amount" type="number" min="1" step="0.01" value={billingForm.invoiceAmount} onChange={(event) => updateBilling("invoiceAmount", event.target.value)} required />
            </div>
            <Button type="submit" disabled={saving}>Add Billing Rule</Button>
          </form>
        </section>
      </div>

      {canUseWhatsApp && <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Generated Jobs</h2>
        <Table
          columns={[
            { key: "jobSequenceNumber", label: "Seq" },
            { key: "service", label: "Service", render: (row) => row.contractService?.serviceName },
            { key: "scheduledDate", label: "Scheduled", render: (row) => formatDate(row.job?.scheduledDate) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.job?.status} /> },
            { key: "actions", label: "Actions", render: (row) => row.jobId ? <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/jobs/${row.jobId}`}>View</Link> : null }
          ]}
          rows={contract.jobLinks || []}
          emptyMessage="No generated jobs yet"
        />
      </section>}

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Generated Invoices</h2>
        <Table
          columns={[
            { key: "invoiceNumber", label: "Invoice" },
            { key: "invoiceDate", label: "Date", render: (row) => formatDate(row.invoiceDate) },
            { key: "amount", label: "Amount", render: (row) => formatAmount(row.amount) },
            { key: "paidAmount", label: "Paid", render: (row) => formatAmount(row.paidAmount) },
            { key: "balanceAmount", label: "Balance", render: (row) => formatAmount(row.balanceAmount || row.amount) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "actions", label: "Actions", render: (row) => <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/invoices/${row.id}`}>View</Link> }
          ]}
          rows={contract.invoices || []}
          emptyMessage="No invoices generated yet"
        />
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">WhatsApp History</h2>
        <Table
          columns={[
            { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
            { key: "templateCode", label: "Template" },
            { key: "phoneNumber", label: "Phone" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "errorMessage", label: "Error", render: (row) => row.errorMessage || "N/A" }
          ]}
          rows={logs}
          emptyMessage="No WhatsApp messages for this contract"
        />
      </section>
    </>
  );
}
