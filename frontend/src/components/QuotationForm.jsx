import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import Input from "./Input";

const emptyItem = { itemName: "", description: "", quantity: 1, unitPrice: 0 };

function dateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculate(items, discountType, discountValue, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const rawDiscount = Number(discountValue || 0);
  const discountAmount = discountType === "PERCENTAGE"
    ? subtotal * (Math.min(rawDiscount, 100) / 100)
    : discountType === "FIXED"
      ? Math.min(rawDiscount, subtotal)
      : 0;
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxableAmount * (Number(taxRate || 0) / 100);

  return { subtotal, discountAmount, taxAmount, totalAmount: taxableAmount + taxAmount };
}

export default function QuotationForm({ customers, quotation, loading, selectedCustomerId, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    customerId: quotation?.customerId || "",
    title: quotation?.title || "",
    description: quotation?.description || "",
    quotationDate: dateInput(quotation?.quotationDate) || new Date().toISOString().slice(0, 10),
    validUntil: dateInput(quotation?.validUntil),
    discountType: quotation?.discountType || "",
    discountValue: quotation?.discountValue || 0,
    taxRate: quotation?.taxRate || 0,
    notes: quotation?.notes || "",
    terms: quotation?.terms || "",
    items: quotation?.items?.length ? quotation.items.map((item) => ({
      itemName: item.itemName,
      description: item.description || "",
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0)
    })) : [{ ...emptyItem }]
  });

  const totals = useMemo(() => calculate(form.items, form.discountType, form.discountValue, form.taxRate), [form]);

  useEffect(() => {
    if (selectedCustomerId) {
      setForm((current) => ({ ...current, customerId: selectedCustomerId }));
    }
  }, [selectedCustomerId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setForm((current) => ({ ...current, items: current.items.filter((_item, itemIndex) => itemIndex !== index) }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      discountType: form.discountType || null,
      items: form.items.filter((item) => item.itemName?.trim())
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Customer
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.customerId} onChange={(event) => updateField("customerId", event.target.value)} required>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          <Input label="Title" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
          <Input label="Quotation date" type="date" value={form.quotationDate} onChange={(event) => updateField("quotationDate", event.target.value)} required />
          <Input label="Valid until" type="date" value={form.validUntil} onChange={(event) => updateField("validUntil", event.target.value)} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Terms
            <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.terms} onChange={(event) => updateField("terms", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">Items</h2>
          <Button type="button" variant="secondary" onClick={addItem}>Add Item</Button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1.2fr_1fr_120px_140px_120px_auto]">
              <Input label="Item" value={item.itemName} onChange={(event) => updateItem(index, "itemName", event.target.value)} required />
              <Input label="Description" value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} />
              <Input label="Qty" type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required />
              <Input label="Unit price" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", event.target.value)} required />
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">Line total</span>
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium">{formatAmount(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</div>
              </div>
              <div className="flex items-end">
                <Button type="button" variant="danger" className="w-full md:w-auto" onClick={() => removeItem(index)} disabled={form.items.length === 1}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Discount type
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={form.discountType} onChange={(event) => updateField("discountType", event.target.value)}>
              <option value="">None</option>
              <option value="FIXED">Fixed</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
          </label>
          <Input label="Discount value" type="number" min="0" step="0.01" value={form.discountValue} onChange={(event) => updateField("discountValue", event.target.value)} />
          <Input label="Tax rate %" type="number" min="0" step="0.01" value={form.taxRate} onChange={(event) => updateField("taxRate", event.target.value)} />
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatAmount(totals.subtotal)}</strong></div>
            <div className="flex justify-between"><span>Discount</span><strong>{formatAmount(totals.discountAmount)}</strong></div>
            <div className="flex justify-between"><span>Tax</span><strong>{formatAmount(totals.taxAmount)}</strong></div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base"><span>Total</span><strong>{formatAmount(totals.totalAmount)}</strong></div>
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Quotation"}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
