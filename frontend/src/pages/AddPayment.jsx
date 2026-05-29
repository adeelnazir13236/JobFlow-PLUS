import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import { getJobs } from "../api/jobService";
import { createPayment } from "../api/paymentService";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import PaymentForm from "../components/PaymentForm";

export default function AddPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");
        const [customerData, jobData] = await Promise.all([getCustomers(), getJobs()]);
        setCustomers(customerData);
        setJobs(jobData);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load payment form data");
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, []);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      setError("");
      await createPayment(payload);
      navigate("/payments");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Payment" description="Create an invoice or payment record for a completed job." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading payment form...</Alert>
      ) : (
        <PaymentForm
          customers={customers}
          jobs={jobs}
          defaultCustomerId={searchParams.get("customerId") || ""}
          defaultJobId={searchParams.get("jobId") || ""}
          loading={saving}
          onCancel={() => navigate("/payments")}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
