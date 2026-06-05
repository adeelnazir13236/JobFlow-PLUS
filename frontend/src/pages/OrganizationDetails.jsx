import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getFeatures, getPlans } from "../api/planService";
import { getOrganization, updateOrganizationFeatureOverrides, updateOrganizationSubscription } from "../api/organizationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

function formatShortDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}

function billingCycleLabel(value) {
  return value ? value.replaceAll("_", " ") : "N/A";
}

function priceForSubscription(subscription) {
  if (!subscription?.plan) {
    return 0;
  }

  if (subscription.billingCycle === "YEARLY") {
    return subscription.plan.yearlyPrice;
  }

  if (subscription.billingCycle === "HALF_YEARLY") {
    return subscription.plan.halfYearlyPrice;
  }

  return subscription.plan.monthlyPrice;
}

export default function OrganizationDetails() {
  const { id } = useParams();
  const [organization, setOrganization] = useState(null);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [subscriptionForm, setSubscriptionForm] = useState({ planId: "", status: "ACTIVE", billingCycle: "MONTHLY", startDate: "", endDate: "" });
  const [overrideState, setOverrideState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrganization() {
      try {
        setLoading(true);
        setError("");
        const result = await getOrganization(id);
        const [planRows, featureRows] = await Promise.all([getPlans(), getFeatures()]);

        if (mounted) {
          setOrganization(result);
          setPlans(planRows.filter((plan) => plan.status === "ACTIVE"));
          setFeatures(featureRows.filter((feature) => feature.status === "ACTIVE"));
          const currentSubscription = result.subscriptions?.[0];
          setSubscriptionForm({
            planId: currentSubscription?.planId || "",
            status: currentSubscription?.status || "ACTIVE",
            billingCycle: currentSubscription?.billingCycle || "MONTHLY",
            startDate: currentSubscription?.startDate ? currentSubscription.startDate.slice(0, 10) : "",
            endDate: currentSubscription?.endDate ? currentSubscription.endDate.slice(0, 10) : ""
          });
          setOverrideState(Object.fromEntries((result.featureOverrides || []).map((override) => [override.featureId, override.enabled])));
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
    ["Payments", organization._count?.payments || 0],
    ["Org Invoices", organization._count?.billingInvoices || 0]
  ];

  const currentSubscription = organization.subscriptions?.[0];
  const subscriptionPrice = priceForSubscription(currentSubscription);

  async function saveSubscription(event) {
    event.preventDefault();
    const subscription = await updateOrganizationSubscription(organization.id, subscriptionForm);
    setSubscriptionForm({
      planId: subscription.planId,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate ? subscription.startDate.slice(0, 10) : "",
      endDate: subscription.endDate ? subscription.endDate.slice(0, 10) : ""
    });
    setOrganization((current) => current ? { ...current, plan: subscription.plan?.code || current.plan, subscriptions: [subscription] } : current);
  }

  async function saveOverrides() {
    const overrides = Object.entries(overrideState).map(([featureId, enabled]) => ({ featureId: Number(featureId), enabled }));
    await updateOrganizationFeatureOverrides(organization.id, overrides);
  }

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
              <dt className="text-slate-500">Subscription</dt>
              <dd className="font-medium text-slate-950"><StatusBadge status={organization.subscriptions?.[0]?.status || "INACTIVE"} /></dd>
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
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-950">Subscription</h2>
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Current Subscription</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">
                  {currentSubscription?.plan?.name || organization.plan || "No active plan"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {currentSubscription?.plan?.code || "N/A"} plan, {billingCycleLabel(currentSubscription?.billingCycle).toLowerCase()} billing
                </p>
              </div>
              <StatusBadge status={currentSubscription?.status || "INACTIVE"} />
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-slate-500">Billing Amount</div>
                <div className="font-semibold text-slate-950">{formatMoney(subscriptionPrice)}</div>
              </div>
              <div>
                <div className="text-slate-500">Billing Cycle</div>
                <div className="font-semibold text-slate-950">{billingCycleLabel(currentSubscription?.billingCycle)}</div>
              </div>
              <div>
                <div className="text-slate-500">Start Date</div>
                <div className="font-semibold text-slate-950">{formatShortDate(currentSubscription?.startDate)}</div>
              </div>
              <div>
                <div className="text-slate-500">End Date</div>
                <div className="font-semibold text-slate-950">{formatShortDate(currentSubscription?.endDate)}</div>
              </div>
              <div>
                <div className="text-slate-500">Monthly Price</div>
                <div className="font-semibold text-slate-950">{formatMoney(currentSubscription?.plan?.monthlyPrice)}</div>
              </div>
              <div>
                <div className="text-slate-500">Half Yearly Price</div>
                <div className="font-semibold text-slate-950">{formatMoney(currentSubscription?.plan?.halfYearlyPrice)}</div>
              </div>
              <div>
                <div className="text-slate-500">Yearly Price</div>
                <div className="font-semibold text-slate-950">{formatMoney(currentSubscription?.plan?.yearlyPrice)}</div>
              </div>
              <div>
                <div className="text-slate-500">Recent Billing Invoices</div>
                <div className="font-semibold text-slate-950">{organization._count?.billingInvoices || 0}</div>
              </div>
            </div>
          </div>
          <form className="space-y-4" onSubmit={saveSubscription}>
            <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Plan</span><select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={subscriptionForm.planId} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, planId: event.target.value })} required><option value="">Select plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} ({plan.code})</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Status</span><select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={subscriptionForm.status} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, status: event.target.value })}><option value="ACTIVE">ACTIVE</option><option value="TRIAL">TRIAL</option><option value="INACTIVE">INACTIVE</option><option value="CANCELLED">CANCELLED</option><option value="EXPIRED">EXPIRED</option></select></label>
              <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Billing Cycle</span><select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={subscriptionForm.billingCycle} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, billingCycle: event.target.value })}><option value="MONTHLY">MONTHLY</option><option value="HALF_YEARLY">HALF YEARLY</option><option value="YEARLY">YEARLY</option></select></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="interactive-field h-10 rounded-md border border-slate-300 px-3 text-sm" type="date" value={subscriptionForm.startDate} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, startDate: event.target.value })} />
              <input className="interactive-field h-10 rounded-md border border-slate-300 px-3 text-sm" type="date" value={subscriptionForm.endDate} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, endDate: event.target.value })} />
            </div>
            <Button type="submit">Save Subscription</Button>
          </form>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-950">Feature Overrides</h2><Button onClick={saveOverrides}>Save Overrides</Button></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <label key={feature.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(overrideState[feature.id])} onChange={(event) => setOverrideState((current) => ({ ...current, [feature.id]: event.target.checked }))} />
                {feature.name}
              </label>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Recent Organization Billing</h2>
            <span className="text-sm text-slate-500">{organization._count?.billingInvoices || 0} invoices</span>
          </div>
          <Table
            columns={[
              { key: "invoiceNumber", label: "Invoice" },
              { key: "plan", label: "Plan", render: (row) => row.plan?.name || "N/A" },
              { key: "billingCycle", label: "Cycle", render: (row) => billingCycleLabel(row.billingCycle) },
              { key: "amount", label: "Amount", render: (row) => formatMoney(row.amount) },
              { key: "balanceAmount", label: "Balance", render: (row) => formatMoney(row.balanceAmount) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "dueDate", label: "Due", render: (row) => formatShortDate(row.dueDate) }
            ]}
            rows={organization.billingInvoices || []}
            emptyMessage="No organization billing invoices found"
          />
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
