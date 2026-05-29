import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomer } from "../api/customerService";
import Alert from "../components/Alert";
import CustomerForm from "../components/CustomerForm";
import PageHeader from "../components/PageHeader";

export default function AddCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(payload) {
    try {
      setLoading(true);
      setError("");
      const customer = await createCustomer(payload);
      navigate(`/customers/${customer.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create customer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Customer" description="Create a customer profile and capture system information." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <CustomerForm loading={loading} onCancel={() => navigate("/customers")} onSubmit={handleSubmit} />
    </>
  );
}
