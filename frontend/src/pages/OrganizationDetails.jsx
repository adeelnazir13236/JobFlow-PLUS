import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrganization } from "../api/organizationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className="interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-medium text-slate-500">{label}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
