import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomer, getCustomers } from "../api/customerService";
import { getOrganizations } from "../api/organizationService";
import { createQuotation } from "../api/quotationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import QuotationForm from "../components/QuotationForm";

const emptyCustomer = {
  organizationId: "",
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  area: "",
  city: "",
  address: "",
  jobPaymentAmount: 0,
  notes: "",
  status: "ACTIVE"
};

export default function AddQuotation() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN";
  const [customers, setCustomers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState(emptyCustomer);
  const [quickSaving, setQuickSaving] = useState(false);
  const [error, setError] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCustomers()
      .then((data) => {
        setCustomers(data);
        setCustomerError("");
      })
      .catch((err) => {
        setCustomers([]);
        setCustomerError(err.response?.data?.message || "Unable to load customers");
      });

    if (isSystemAdmin) {
      getOrganizations({ status: "ACTIVE" })
        .then(setOrganizations)
        .catch(() => setOrganizations([]));
    }
  }, []);

  function updateQuickCustomer(field, value) {
    setQuickCustomer((current) => ({ ...current, [field]: value }));
  }

  async function handleQuickAddCustomer(event) {
    event.preventDefault();

    try {
      setQuickSaving(true);
      setCustomerError("");

      const payload = {
        ...quickCustomer,
        jobPaymentAmount: Number(quickCustomer.jobPaymentAmount || 0),
        organizationId: isSystemAdmin ? quickCustomer.organizationId : undefined,
        systems: []
      };
      const customer = await createCustomer(payload);

      setCustomers((current) => [customer, ...current.filter((item) => item.id !== customer.id)]);
      setSelectedCustomerId(String(customer.id));
      setQuickCustomer(emptyCustomer);
      setShowQuickAdd(false);
    } catch (err) {
      setCustomerError(err.response?.data?.message || "Unable to create customer");
    } finally {
      setQuickSaving(false);
    }
  }

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      setError("");
      const quotation = await createQuotation(payload);
      navigate(`/quotations/${quotation.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create quotation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Create Quotation" description="Build an estimate with line items, discount, and tax." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {customerError && <div className="mb-4"><Alert>{customerError}</Alert></div>}

      <section className="mb-5 rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Customer</h2>
            <p className="text-sm text-slate-500">Select an existing customer or add a new one for this quotation.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShowQuickAdd((value) => !value)}>
            {showQuickAdd ? "Close Quick Add" : "Quick Add Customer"}
          </Button>
        </div>

        {showQuickAdd && (
          <form className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2" onSubmit={handleQuickAddCustomer}>
            {isSystemAdmin && (
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Organization
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                  value={quickCustomer.organizationId}
                  onChange={(event) => updateQuickCustomer("organizationId", event.target.value)}
                  required
                >
                  <option value="">Select organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </label>
            )}
            <Input label="Customer Name" value={quickCustomer.name} onChange={(event) => updateQuickCustomer("name", event.target.value)} required />
            <Input label="Phone" value={quickCustomer.phone} onChange={(event) => updateQuickCustomer("phone", event.target.value)} required />
            <Input label="WhatsApp" value={quickCustomer.whatsapp} onChange={(event) => updateQuickCustomer("whatsapp", event.target.value)} />
            <Input label="Email" type="email" value={quickCustomer.email} onChange={(event) => updateQuickCustomer("email", event.target.value)} />
            <Input label="Area" value={quickCustomer.area} onChange={(event) => updateQuickCustomer("area", event.target.value)} />
            <Input label="City" value={quickCustomer.city} onChange={(event) => updateQuickCustomer("city", event.target.value)} />
            <Input label="Payment Amount Per Job" type="number" min="0" step="0.01" value={quickCustomer.jobPaymentAmount} onChange={(event) => updateQuickCustomer("jobPaymentAmount", event.target.value)} />
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Address
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200" value={quickCustomer.address} onChange={(event) => updateQuickCustomer("address", event.target.value)} />
            </label>
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={quickSaving}>{quickSaving ? "Saving..." : "Save & Select Customer"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </section>

      <QuotationForm customers={customers} selectedCustomerId={selectedCustomerId} loading={saving} onSubmit={handleSubmit} onCancel={() => navigate("/quotations")} />
    </>
  );
}
