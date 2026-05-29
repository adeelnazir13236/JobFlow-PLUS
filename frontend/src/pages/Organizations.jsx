import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createOrganization, getOrganizations, updateOrganization } from "../api/organizationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "ACTIVE",
  plan: "PLUS"
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOrganizations() {
    try {
      setLoading(true);
      setError("");
      setOrganizations(await getOrganizations({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load organizations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
  }, [search, statusFilter, planFilter]);

  const filteredOrganizations = useMemo(() => organizations, [organizations]);

  function openCreateModal() {
    setEditingOrganization(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(organization) {
    setEditingOrganization(organization);
    setForm({
      name: organization.name || "",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      status: organization.status || "ACTIVE",
      plan: organization.plan || "PLUS"
    });
    setModalOpen(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingOrganization) {
        await updateOrganization(editingOrganization.id, form);
      } else {
        await createOrganization(form);
      }

      setModalOpen(false);
      await loadOrganizations();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save organization");
    } finally {
      setSaving(false);
    }
  }

  const activeOrganizations = organizations.filter((organization) => organization.status === "ACTIVE").length;
  const totalUsers = organizations.reduce((total, organization) => total + (organization._count?.users || 0), 0);
  const totalCustomers = organizations.reduce((total, organization) => total + (organization._count?.customers || 0), 0);
  const totalJobs = organizations.reduce((total, organization) => total + (organization._count?.jobs || 0), 0);

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Manage tenant workspaces, plans, and access status."
        action={<Button onClick={openCreateModal}>Add Organization</Button>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Organizations", organizations.length],
          ["Active", activeOrganizations],
          ["Users", totalUsers],
          ["Jobs", totalJobs]
        ].map(([label, value]) => (
          <div key={label} className="interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>
      <div className="mb-4 max-w-xl">
        <Input
          label="Search organizations"
          placeholder="Search by name, email, plan, or status"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select
            className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Plan</span>
          <select
            className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value)}
          >
            <option value="">All plans</option>
            <option value="FREE">FREE</option>
            <option value="PLUS">PLUS</option>
            <option value="PRO">PRO</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </label>
      </div>
      {loading ? (
        <Alert type="info">Loading organizations...</Alert>
      ) : (
        <Table
          columns={[
            { key: "name", label: "Name", render: (row) => <Link className="font-medium text-slate-950" to={`/organizations/${row.id}`}>{row.name}</Link> },
            { key: "email", label: "Email", render: (row) => row.email || "N/A" },
            { key: "plan", label: "Plan" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "users", label: "Users", render: (row) => row._count?.users || 0 },
            { key: "customers", label: "Customers", render: (row) => row._count?.customers || 0 },
            { key: "jobs", label: "Jobs", render: (row) => row._count?.jobs || 0 },
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            { key: "followUps", label: "Follow-ups", render: (row) => row._count?.followUps || 0 },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex gap-3">
                  <button className="font-medium text-slate-950" type="button" onClick={() => openEditModal(row)}>Edit</button>
                  <button
                    className="font-medium text-slate-950"
                    type="button"
                    onClick={async () => {
                      await updateOrganization(row.id, { ...row, status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
                      await loadOrganizations();
                    }}
                  >
                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )
            }
          ]}
          rows={filteredOrganizations}
          emptyMessage={search ? "No organizations match your search" : "No organizations found"}
        />
      )}
      <div className="sr-only">Total customers: {totalCustomers}</div>
      <Modal
        open={modalOpen}
        title={editingOrganization ? "Edit Organization" : "Add Organization"}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Organization Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
          <Input label="Email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
          <Input label="Address" value={form.address} onChange={(event) => updateForm("address", event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Plan</span>
              <select
                className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                value={form.plan}
                onChange={(event) => updateForm("plan", event.target.value)}
              >
                <option value="FREE">FREE</option>
                <option value="PLUS">PLUS</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
              <select
                className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Organization"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
