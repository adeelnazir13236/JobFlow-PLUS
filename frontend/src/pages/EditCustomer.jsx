import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomer, updateCustomer } from "../api/customerService";
import Alert from "../components/Alert";
import CustomerForm from "../components/CustomerForm";
import PageHeader from "../components/PageHeader";

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true);
        setError("");
        setCustomer(await getCustomer(id));
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load customer");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id]);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      setError("");
      const updatedCustomer = await updateCustomer(id, payload);
      navigate(`/customers/${updatedCustomer.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Edit Customer" description="Update customer profile and solar/system details." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading customer...</Alert>
      ) : (
        customer && (
          <CustomerForm
            customer={customer}
            loading={saving}
            onCancel={() => navigate(`/customers/${id}`)}
            onSubmit={handleSubmit}
          />
        )
      )}
    </>
  );
}
