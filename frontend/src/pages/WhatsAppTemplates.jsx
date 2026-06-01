import { useEffect, useMemo, useState } from "react";
import { createWhatsAppTemplate, getWhatsAppTemplates, updateWhatsAppTemplate } from "../api/whatsappService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import Table from "../components/Table";

const placeholders = ["customer_name", "quotation_number", "invoice_number", "amount", "job_date", "job_time", "contract_number", "contract_end_date", "document_link"];
const emptyForm = { id: null, templateCode: "", templateName: "", category: "", messageBody: "", isActive: true };

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTemplates() {
    setTemplates(await getWhatsAppTemplates());
  }

  useEffect(() => {
    loadTemplates().catch((err) => setError(err.response?.data?.message || "Unable to load templates"));
  }, []);

  const preview = useMemo(() => {
    const sample = {
      customer_name: "ABC Office",
      quotation_number: "QUO-000001",
      invoice_number: "INV-000001",
      amount: "25,000.00",
      job_date: new Date().toLocaleDateString(),
      job_time: "09:00",
      contract_number: "AMC-001",
      contract_end_date: new Date().toLocaleDateString(),
      document_link: "https://example.com/document"
    };
    return form.messageBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => sample[key] || "");
  }, [form.messageBody]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (form.id) {
        await updateWhatsAppTemplate(form.id, form);
      } else {
        await createWhatsAppTemplate(form);
      }
      setForm(emptyForm);
      setMessage("Template saved.");
      await loadTemplates();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="WhatsApp Templates" description="Manage outbound message templates and placeholders." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}
      <form className="mb-6 rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Template Code" value={form.templateCode} onChange={(event) => updateField("templateCode", event.target.value)} disabled={Boolean(form.id)} required />
          <Input label="Template Name" value={form.templateName} onChange={(event) => updateField("templateName", event.target.value)} required />
          <Input label="Category" value={form.category} onChange={(event) => updateField("category", event.target.value)} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} />
            Active
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Message Body
            <textarea className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.messageBody} onChange={(event) => updateField("messageBody", event.target.value)} required />
          </label>
        </div>
        <div className="mt-3 text-xs text-slate-500">Placeholders: {placeholders.map((item) => `{{${item}}}`).join(", ")}</div>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{preview || "Preview will appear here."}</div>
        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Template"}</Button>
          {form.id && <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>Cancel Edit</Button>}
        </div>
      </form>

      <Table
        columns={[
          { key: "templateCode", label: "Code" },
          { key: "templateName", label: "Name" },
          { key: "category", label: "Category", render: (row) => row.category || "N/A" },
          { key: "isActive", label: "Active", render: (row) => row.isActive ? "Yes" : "No" },
          { key: "actions", label: "Actions", render: (row) => <Button variant="secondary" onClick={() => setForm(row)}>Edit</Button> }
        ]}
        rows={templates}
        emptyMessage="No WhatsApp templates found"
      />
    </>
  );
}
