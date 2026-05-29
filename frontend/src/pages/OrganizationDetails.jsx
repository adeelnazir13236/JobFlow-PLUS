import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrganization } from "../api/organizationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export default function OrganizationDetails() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrganization() {
      try {
        setLoading(true);
        setError("");
        const result = await getOrganization(id);

        if (mounted) {
          setOrganization(result);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load organization");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrganization();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <Alert type="info">Loading organization...</Alert>;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (!organization) {
    return <Alert>Organization not found</Alert>;
  }

  const metrics = [
    ["Users", organization._count?.users || 0],
    ["Customers", organization._count?.customers || 0],
    ["Jobs", organization._count?.jobs || 0],
    ["Follow-ups", organization._count?.followUps || 0],
    ["Call Logs", organization._count?.callLogs || 0],
    ["Payments", organization._count?.payments || 0]
  ];

  return (
    <>
      <PageHeader
        title={organization.name}
        description="Tenant profile, subscription state, and usage snapshot."
        action={
          <Link to="/organizations">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Profile</h2>
            <StatusBadge status={organization.status} />
          </div>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-medium text-slate-950">{organization.plan}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-950">{organization.email || "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-950">{organization.phone || "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Address</dt>
              <dd className="font-medium text-slate-950">{organization.address || "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium text-slate-950">{formatDate(organization.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Updated</dt>
              <dd className="font-medium text-slate-950">{formatDate(organization.updatedAt)}</dd>
            </div>
          </dl>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Usage</h2>
            <span className="text-sm text-slate-500">Current tenant records</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map(([label, value]) => (
              <div key={label} className="interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500">{label}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Users</h2>
            <Link className="text-sm font-medium text-slate-950" to={`/users?organizationId=${organization.id}`}>Manage users</Link>
          </div>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
            ]}
            rows={organization.users || []}
            emptyMessage="No users found"
          />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Customers</h2>
            <span className="text-sm text-slate-500">{organization._count?.customers || 0} total</span>
          </div>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "phone", label: "Phone" },
              { key: "city", label: "City" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
            ]}
            rows={organization.customers || []}
            emptyMessage="No customers found"
          />
        </section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Jobs</h2>
            <span className="text-sm text-slate-500">{organization._count?.jobs || 0} total</span>
          </div>
          <Table
            columns={[
              { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
              { key: "scheduledDate", label: "Scheduled", render: (row) => formatDate(row.scheduledDate) },
              { key: "assignedStaff", label: "Staff", render: (row) => row.assignedStaff?.name || "Unassigned" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
            ]}
            rows={organization.jobs || []}
            emptyMessage="No jobs found"
          />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Call Logs</h2>
            <span className="text-sm text-slate-500">{organization._count?.callLogs || 0} total</span>
          </div>
          <Table
            columns={[
              { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
              { key: "agent", label: "Agent", render: (row) => row.agent?.name || "N/A" },
              { key: "response", label: "Response" },
              { key: "createdAt", label: "Logged", render: (row) => formatDate(row.createdAt) }
            ]}
            rows={organization.callLogs || []}
            emptyMessage="No call logs found"
          />
        </section>
      </div>
    </>
  );
}
