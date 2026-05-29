import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import { getJobs } from "../api/jobService";
import { getPayment, updatePayment } from "../api/paymentService";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import PaymentForm from "../components/PaymentForm";

export default function EditPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");
        const [paymentData, customerData, jobData] = await Promise.all([
          getPayment(id),
          getCustomers(),
          getJobs()
        ]);
        setPayment(paymentData);
        setCustomers(customerData);
        setJobs(jobData);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load payment");
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [id]);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      setError("");
      await updatePayment(id, payload);
      navigate(`/payments/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Edit Payment" description="Update payment amount, method, status, date, or remarks." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading payment...</Alert>
      ) : (
        payment && (
          <PaymentForm
            customers={customers}
            jobs={jobs}
            payment={payment}
            loading={saving}
            onCancel={() => navigate(`/payments/${id}`)}
            onSubmit={handleSubmit}
          />
        )
      )}
    </>
  );
}
