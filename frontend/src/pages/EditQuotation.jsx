import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import { getQuotation, updateQuotation } from "../api/quotationService";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import QuotationForm from "../components/QuotationForm";

export default function EditQuotation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customerError, setCustomerError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setCustomerError("");
        const [quotationData, customerData] = await Promise.all([getQuotation(id), getCustomers()]);
        setQuotation(quotationData);
        setCustomers(customerData);
      } catch (err) {
        const message = err.response?.data?.message || "Unable to load quotation";
        setError(message);
        if (err.config?.url?.includes("/customers")) {
          setCustomerError(message);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      setError("");
      await updateQuotation(id, payload);
      navigate(`/quotations/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update quotation");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Alert type="info">Loading quotation...</Alert>;
  }

  if (!quotation) {
    return <Alert>{error || "Quotation not found"}</Alert>;
  }

  return (
    <>
      <PageHeader title="Edit Quotation" description={quotation.quotationNumber} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {customerError && <div className="mb-4"><Alert>{customerError}</Alert></div>}
      <QuotationForm customers={customers} quotation={quotation} loading={saving} onSubmit={handleSubmit} onCancel={() => navigate(`/quotations/${id}`)} />
    </>
  );
}
