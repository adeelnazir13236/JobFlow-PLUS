import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrganization } from "../api/organizationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  status: "ACTIVE",
  plan: "PLUS"
};

export default function AddOrganization() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const organization = await createOrganization(form);
      navigate(`/organizations/${organization.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create organization");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Organization" description="Create a new tenant workspace for a customer company." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form className="interactive-card max-w-3xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <Input label="Organization Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
        </div>
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
          <Button variant="secondary" onClick={() => navigate("/organizations")}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Organization"}</Button>
        </div>
      </form>
    </>
  );
}
