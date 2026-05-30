import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import { createContract } from "../api/contractService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";

export default function AddContract() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    contractValue: ""
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const contract = await createContract(form);
      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create contract");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Create Contract" description="Create the contract first, then add service schedules and billing rules." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form className="max-w-3xl space-y-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Customer
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.customerId} onChange={(event) => updateField("customerId", event.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </label>
        <Input label="Contract title" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
        <Input label="Description" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Start date" type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} required />
          <Input label="End date" type="date" value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} required />
        </div>
        <Input label="Contract value" type="number" min="0" step="0.01" value={form.contractValue} onChange={(event) => updateField("contractValue", event.target.value)} />
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Contract"}</Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/contracts")}>Cancel</Button>
        </div>
      </form>
    </>
  );
}
