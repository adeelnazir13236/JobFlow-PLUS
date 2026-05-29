import { useState } from "react";
import Button from "./Button";
import Input from "./Input";

const emptySystem = {
  systemType: "",
  systemSize: "",
  numberOfPanels: "",
  installationType: "",
  notes: ""
};

function toFormState(customer) {
  return {
    name: customer?.name || "",
    phone: customer?.phone || "",
    whatsapp: customer?.whatsapp || "",
    email: customer?.email || "",
    address: customer?.address || "",
    area: customer?.area || "",
    city: customer?.city || "",
    jobPaymentAmount: customer?.jobPaymentAmount || "",
    notes: customer?.notes || "",
    status: customer?.status || "ACTIVE",
    systems: customer?.systems?.length
      ? customer.systems.map((system) => ({
          systemType: system.systemType || "",
          systemSize: system.systemSize || "",
          numberOfPanels: system.numberOfPanels || "",
          installationType: system.installationType || "",
          notes: system.notes || ""
        }))
      : [{ ...emptySystem }]
  };
}

export default function CustomerForm({ customer, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(customer));

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSystem(index, field, value) {
    setForm((current) => ({
      ...current,
      systems: current.systems.map((system, systemIndex) =>
        systemIndex === index ? { ...system, [field]: value } : system
      )
    }));
  }

  function addSystem() {
    setForm((current) => ({ ...current, systems: [...current.systems, { ...emptySystem }] }));
  }

  function removeSystem(index) {
    setForm((current) => ({
      ...current,
      systems: current.systems.length === 1
        ? [{ ...emptySystem }]
        : current.systems.filter((_system, systemIndex) => systemIndex !== index)
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const systems = form.systems
      .filter((system) => system.systemType.trim())
      .map((system) => ({
        ...system,
        numberOfPanels: system.numberOfPanels ? Number(system.numberOfPanels) : null
      }));

    onSubmit({
      ...form,
      jobPaymentAmount: Number(form.jobPaymentAmount || 0),
      systems
    });
  }

  return (
    <form onSubmit={handleSubmit} className="interactive-card space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-2">
        <Input label="Customer Name" value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
        <Input label="Phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
        <Input label="WhatsApp" value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        <Input label="Area" value={form.area} onChange={(event) => updateField("area", event.target.value)} />
        <Input label="City" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
        <Input
          label="Payment Amount Per Job"
          type="number"
          min="0"
          step="0.01"
          value={form.jobPaymentAmount}
          onChange={(event) => updateField("jobPaymentAmount", event.target.value)}
          required
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
          <textarea
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Customer Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </label>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Solar/System Details</h2>
          <Button variant="secondary" onClick={addSystem}>Add System</Button>
        </div>
        <div className="space-y-4">
          {form.systems.map((system, index) => (
            <div key={index} className="interactive-card grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
              <Input label="System Type" value={system.systemType} onChange={(event) => updateSystem(index, "systemType", event.target.value)} />
              <Input label="System Size" value={system.systemSize} onChange={(event) => updateSystem(index, "systemSize", event.target.value)} />
              <Input label="Number of Panels" type="number" value={system.numberOfPanels} onChange={(event) => updateSystem(index, "numberOfPanels", event.target.value)} />
              <Input label="Installation Type" value={system.installationType} onChange={(event) => updateSystem(index, "installationType", event.target.value)} />
              <label className="block lg:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">System Notes</span>
                <textarea
                  value={system.notes}
                  onChange={(event) => updateSystem(index, "notes", event.target.value)}
                  className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <div className="lg:col-span-2">
                <Button variant="secondary" onClick={() => removeSystem(index)}>Remove System</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Customer"}</Button>
      </div>
    </form>
  );
}
