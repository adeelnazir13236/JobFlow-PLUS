import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getOrganizations } from "../api/organizationService";
import { createUser, getUsers, resetUserPassword, updateUser } from "../api/userService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const emptyForm = {
  organizationId: "",
  name: "",
  email: "",
  password: "",
  role: "STAFF",
  status: "ACTIVE"
};

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedOrganizationId = searchParams.get("organizationId") || "";
  const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN";

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");
      const params = selectedOrganizationId ? { organizationId: selectedOrganizationId } : {};
      setUsers(await getUsers(params));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    setCurrentUser(storedUser);
  }, []);

  useEffect(() => {
    async function loadOrganizations() {
      if (!isSystemAdmin) {
        return;
      }

      try {
        setOrganizations(await getOrganizations({ status: "ACTIVE" }));
      } catch {
        // User list remains usable without organization filter options.
      }
    }

    loadOrganizations();
  }, [isSystemAdmin]);

  useEffect(() => {
    loadUsers();
  }, [selectedOrganizationId]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditingUser(null);
    setForm({ ...emptyForm, organizationId: selectedOrganizationId });
    setModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm({
      organizationId: user.organizationId || "",
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "STAFF",
      status: user.status || "ACTIVE"
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingUser) {
        await updateUser(editingUser.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status
        });
        setSuccess("User updated.");
      } else {
        await createUser(form);
        setSuccess("User created.");
      }

      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save user");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await resetUserPassword(passwordUser.id, newPassword);
      setPasswordUser(null);
      setNewPassword("");
      setSuccess("Password updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage admins, agents, and staff accounts."
        action={isSystemAdmin ? <Button onClick={openCreateModal}>Add User</Button> : null}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}
      {isSystemAdmin && (
        <div className="mb-4 max-w-xl">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Organization</span>
            <select
              className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              value={selectedOrganizationId}
              onChange={(event) => {
                const value = event.target.value;
                setSearchParams(value ? { organizationId: value } : {});
              }}
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {loading ? (
        <Alert type="info">Loading users...</Alert>
      ) : (
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "organization", label: "Organization", render: (row) => row.organization?.name || "System" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => isSystemAdmin && row.role !== "SYSTEM_ADMIN" ? (
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-9 px-3" type="button" onClick={() => openEditModal(row)}>Edit</Button>
                  <Button className="min-h-9 px-3" variant="secondary" type="button" onClick={() => setPasswordUser(row)}>Password</Button>
                </div>
              ) : "N/A"
            }
          ]}
          rows={users}
        />
      )}
      <Modal open={modalOpen} title={editingUser ? "Edit User" : "Add User"} onClose={() => setModalOpen(false)}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!editingUser && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Organization</span>
              <select
                className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                value={form.organizationId}
                onChange={(event) => updateForm("organizationId", event.target.value)}
                required
              >
                <option value="">Select organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
          )}
          <Input label="Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
          <Input label="Email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} required />
          {!editingUser && <Input label="Password" type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} required minLength={6} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
              <select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" value={form.role} onChange={(event) => updateForm("role", event.target.value)}>
                <option value="ADMIN">ADMIN</option>
                <option value="AGENT">AGENT</option>
                <option value="STAFF">STAFF</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
              <select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save User"}</Button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(passwordUser)} title="Reset Password" onClose={() => setPasswordUser(null)}>
        <form className="space-y-4" onSubmit={handlePasswordReset}>
          <Alert type="info">Updating password for {passwordUser?.name}</Alert>
          <Input label="New Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={6} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPasswordUser(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Update Password"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
