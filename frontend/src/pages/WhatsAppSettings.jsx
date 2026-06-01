import { useEffect, useState } from "react";
import { getWhatsAppSettings, saveWhatsAppSettings, testWhatsAppConnection } from "../api/whatsappService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";

export default function WhatsAppSettings() {
  const [form, setForm] = useState({
    providerType: "MOCK",
    apiKey: "",
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    senderNumber: "",
    isActive: true
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getWhatsAppSettings()
      .then((settings) => {
        if (settings) {
          setForm({
            providerType: settings.providerType || "MOCK",
            apiKey: settings.apiKey || "",
            accessToken: settings.accessToken || "",
            phoneNumberId: settings.phoneNumberId || "",
            businessAccountId: settings.businessAccountId || "",
            senderNumber: settings.senderNumber || "",
            isActive: Boolean(settings.isActive)
          });
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load WhatsApp settings"));
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const settings = await saveWhatsAppSettings(form);
      setForm((current) => ({ ...current, apiKey: settings.apiKey || "", accessToken: settings.accessToken || "" }));
      setMessage("WhatsApp settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save WhatsApp settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const result = await testWhatsAppConnection();
      setMessage(result.message || "Connection test passed.");
    } catch (err) {
      setError(err.response?.data?.message || "Connection test failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="WhatsApp Settings" description="Configure outbound WhatsApp provider for this organization." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {message && <div className="mb-4"><Alert type="success">{message}</Alert></div>}
      <form className="rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Provider
            <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={form.providerType} onChange={(event) => updateField("providerType", event.target.value)}>
              <option value="MOCK">Mock/Test</option>
              <option value="META">Meta WhatsApp Cloud API</option>
            </select>
          </label>
          <Input label="Sender Number" value={form.senderNumber} onChange={(event) => updateField("senderNumber", event.target.value)} />
          <Input label="Phone Number ID" value={form.phoneNumberId} onChange={(event) => updateField("phoneNumberId", event.target.value)} />
          <Input label="Business Account ID" value={form.businessAccountId} onChange={(event) => updateField("businessAccountId", event.target.value)} />
          <Input label="API Key" value={form.apiKey} onChange={(event) => updateField("apiKey", event.target.value)} />
          <Input label="Access Token" value={form.accessToken} onChange={(event) => updateField("accessToken", event.target.value)} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} />
            Active provider
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Settings"}</Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={handleTest}>Test Connection</Button>
        </div>
      </form>
    </>
  );
}
