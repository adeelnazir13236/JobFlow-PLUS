import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrganizations } from "../api/organizationService";
import { createOrganizationAdmin } from "../api/userService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";

const initialForm = {
  organizationId: "",
  name: "",
  email: "",
  password: ""
};

export default function AddOrganizationAdmin() {
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function loadOrganizations() {
      try {
        setLoading(true);
        setError("");
        const rows = await getOrganizations();

        if (mounted) {
          setOrganizations(rows.filter((organization) => organization.status === "ACTIVE"));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load organizations");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      mounted = false;
    };
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const user = await createOrganizationAdmin(form);
      setSuccess(`Admin user created for ${user.organization?.name || "organization"}.`);
      setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create organization admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Organization Admin" description="Create the first admin user for a tenant workspace." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}
      <form className="interactive-card max-w-3xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Organization</span>
          <select
            className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            value={form.organizationId}
            onChange={(event) => updateForm("organizationId", event.target.value)}
            required
            disabled={loading}
          >
            <option value="">{loading ? "Loading organizations..." : "Select organization"}</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Admin Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
        <Input label="Admin Email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} required />
        <Input label="Temporary Password" type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} required minLength={6} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate("/users")}>View Users</Button>
          <Button type="submit" disabled={saving || loading}>{saving ? "Creating..." : "Create Admin User"}</Button>
        </div>
      </form>
    </>
  );
}
