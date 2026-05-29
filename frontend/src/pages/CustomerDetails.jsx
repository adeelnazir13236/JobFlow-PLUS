import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createCallLog } from "../api/callLogService";
import { getCustomer, getCustomerCallLogs } from "../api/customerService";
import { getUsers } from "../api/userService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import CallLogForm from "../components/CallLogForm";
import { DetailGrid, DetailItem, DetailPanel } from "../components/DetailPanel";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function CustomerDetails() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingCallLog, setSavingCallLog] = useState(false);
  const [error, setError] = useState("");

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");
      const [customerData, callLogData, userData] = await Promise.all([
        getCustomer(id),
        getCustomerCallLogs(id),
        getUsers()
      ]);
      setCustomer(customerData);
      setCallLogs(callLogData);
      setUsers(userData);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load customer details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
  }, [id]);

  async function handleCreateCallLog(payload) {
    try {
      setSavingCallLog(true);
      setError("");
      await createCallLog(payload);
      setCallModalOpen(false);
      await loadCustomer();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save call log");
    } finally {
      setSavingCallLog(false);
    }
  }

  if (loading) {
    return <Alert type="info">Loading customer details...</Alert>;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (!customer) {
    return <Alert>Customer not found</Alert>;
  }

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`${customer.area || "No area"}, ${customer.city || "No city"} - ${customer.phone}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setCallModalOpen(true)}>Add Call Log</Button>
            <Link to={`/customers/${customer.id}/edit`}>
              <Button>Edit Customer</Button>
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <DetailPanel title="Customer Details">
          <DetailGrid columns="grid-cols-1">
            <DetailItem label="Phone">{customer.phone}</DetailItem>
            <DetailItem label="WhatsApp">{customer.whatsapp}</DetailItem>
            <DetailItem label="Email">{customer.email}</DetailItem>
            <DetailItem label="Area">{customer.area}</DetailItem>
            <DetailItem label="City">{customer.city}</DetailItem>
            <DetailItem label="Payment Amount Per Job">{formatAmount(customer.jobPaymentAmount)}</DetailItem>
            <DetailItem label="Created By">{customer.createdBy?.name}</DetailItem>
            <DetailItem label="Updated By">{customer.updatedBy?.name}</DetailItem>
            <DetailItem label="Address">{customer.address}</DetailItem>
            <DetailItem label="Status"><StatusBadge status={customer.status} /></DetailItem>
          </DetailGrid>
        </DetailPanel>
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-950">Solar/System Details</h2>
            <Table
              columns={[
                { key: "systemType", label: "Type" },
                { key: "systemSize", label: "Size" },
                { key: "numberOfPanels", label: "Panels", render: (row) => row.numberOfPanels || "N/A" },
                { key: "installationType", label: "Installation" },
                { key: "notes", label: "Notes", render: (row) => row.notes || "N/A" }
              ]}
              rows={customer.systems || []}
              emptyMessage="No system details added"
            />
          </section>
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-950">Job History</h2>
            <Table
              columns={[
                { key: "scheduledDate", label: "Date", render: (row) => new Date(row.scheduledDate).toLocaleDateString() },
                { key: "scheduledTime", label: "Time" },
                { key: "assignedStaff", label: "Staff", render: (row) => row.assignedStaff?.name || "Unassigned" },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: "paymentStatus",
                  label: "Payment",
                  render: (row) => row.payments?.[0] ? <StatusBadge status={row.payments[0].paymentStatus} /> : "No payment"
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/jobs/${row.id}`}>
                      View
                    </Link>
                  )
                }
              ]}
              rows={customer.jobs || []}
              emptyMessage="No job history found"
            />
          </section>
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-950">Payment Status</h2>
            <Table
              columns={[
                { key: "job", label: "Job", render: (row) => `#${row.jobId}` },
                { key: "totalAmount", label: "Total", render: (row) => formatAmount(row.totalAmount) },
                { key: "paidAmount", label: "Paid", render: (row) => formatAmount(row.paidAmount) },
                { key: "balanceAmount", label: "Balance", render: (row) => formatAmount(row.balanceAmount) },
                { key: "paymentDate", label: "Date", render: (row) => formatDate(row.paymentDate) },
                { key: "paymentStatus", label: "Status", render: (row) => <StatusBadge status={row.paymentStatus} /> },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/payments/${row.id}`}>
                      View
                    </Link>
                  )
                }
              ]}
              rows={customer.payments || []}
              emptyMessage="No payment records found"
            />
          </section>
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-950">Call History</h2>
            <Table
              columns={[
                { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString() },
                { key: "agent", label: "Agent", render: (row) => row.agent?.name || "N/A" },
                { key: "response", label: "Response" },
                { key: "nextCallDate", label: "Next Call", render: (row) => row.nextCallDate ? new Date(row.nextCallDate).toLocaleDateString() : "N/A" },
                { key: "notes", label: "Notes", render: (row) => row.notes || "N/A" }
              ]}
              rows={callLogs}
              emptyMessage="No call history found"
            />
          </section>
          <section>
            <h2 className="mb-3 text-base font-semibold text-slate-950">Follow-up Status</h2>
            <Table
              columns={[
                { key: "followUpDate", label: "Due Date", render: (row) => new Date(row.followUpDate).toLocaleDateString() },
                { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                { key: "notes", label: "Notes", render: (row) => row.notes || "N/A" }
              ]}
              rows={customer.followUps || []}
              emptyMessage="No follow-ups found"
            />
          </section>
        </div>
      </div>
      <Modal open={callModalOpen} title="Add Call Log" onClose={() => setCallModalOpen(false)}>
        <CallLogForm
          customers={[customer]}
          users={users}
          customerId={customer.id}
          loading={savingCallLog}
          onCancel={() => setCallModalOpen(false)}
          onSubmit={handleCreateCallLog}
        />
      </Modal>
    </>
  );
}
