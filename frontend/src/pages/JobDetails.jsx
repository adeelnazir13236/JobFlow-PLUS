import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJob } from "../api/jobService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import { DetailGrid, DetailItem, DetailPanel } from "../components/DetailPanel";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function JobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadJob() {
      try {
        setLoading(true);
        setError("");
        setJob(await getJob(id));
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load job details");
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [id]);

  if (loading) {
    return <Alert type="info">Loading job details...</Alert>;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (!job) {
    return <Alert>Job not found</Alert>;
  }

  return (
    <>
      <PageHeader
        title={`Job #${job.id}`}
        description={`${job.customer?.name || "Customer"} - ${formatDate(job.scheduledDate)} ${job.scheduledTime}`}
        action={
          <div className="flex flex-wrap gap-2">
            {job.status === "COMPLETED" && (
              <Link to={`/payments/add?customerId=${job.customerId}&jobId=${job.id}`}>
                <Button variant="secondary">Add Payment</Button>
              </Link>
            )}
            <Link to={`/jobs/${job.id}/edit`}>
              <Button>Edit Job</Button>
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <DetailPanel title="Job Details">
          <DetailGrid columns="grid-cols-1">
            <DetailItem label="Customer">{job.customer?.name}</DetailItem>
            <DetailItem label="Customer Job Amount">{formatAmount(job.customer?.jobPaymentAmount)}</DetailItem>
            <DetailItem label="Scheduled">{formatDate(job.scheduledDate)} {job.scheduledTime}</DetailItem>
            <DetailItem label="Completed">{formatDate(job.completionDate)}</DetailItem>
            <DetailItem label="Agent">{job.assignedAgent?.name || "Unassigned"}</DetailItem>
            <DetailItem label="Staff">{job.assignedStaff?.name || "Unassigned"}</DetailItem>
            <DetailItem label="Created By">{job.createdBy?.name}</DetailItem>
            <DetailItem label="Updated By">{job.updatedBy?.name}</DetailItem>
            <DetailItem label="Completed By">{job.completedBy?.name}</DetailItem>
            {job.contractLinks?.[0] && (
              <DetailItem label="Contract">
                <Link className="interactive-link text-[var(--brand-blue)]" to={`/contracts/${job.contractLinks[0].contract?.id}`}>
                  {job.contractLinks[0].contract?.contractNumber} #{job.contractLinks[0].jobSequenceNumber}
                </Link>
              </DetailItem>
            )}
            <DetailItem label="Status"><StatusBadge status={job.status} /></DetailItem>
            <DetailItem label="Remarks">{job.remarks}</DetailItem>
          </DetailGrid>
        </DetailPanel>
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-950">Payment Status</h2>
          <Table
            columns={[
              { key: "totalAmount", label: "Total", render: (row) => formatAmount(row.totalAmount) },
              { key: "paidAmount", label: "Paid", render: (row) => formatAmount(row.paidAmount) },
              { key: "balanceAmount", label: "Balance", render: (row) => formatAmount(row.balanceAmount) },
              { key: "paymentMethod", label: "Method" },
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
            rows={job.payments || []}
            emptyMessage="No payment records found"
          />
        </section>
      </div>
    </>
  );
}
