import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import { createJob } from "../api/jobService";
import { getUsers } from "../api/userService";
import Alert from "../components/Alert";
import JobForm from "../components/JobForm";
import PageHeader from "../components/PageHeader";

export default function ScheduleJob() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");
        const [customerData, userData] = await Promise.all([getCustomers(), getUsers()]);
        setCustomers(customerData);
        setUsers(userData);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load job form data");
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
      await createJob(payload);
      navigate("/jobs");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to schedule job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Schedule Job" description="Assign field work to staff and set the visit time." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading job form...</Alert>
      ) : (
        <JobForm
          customers={customers}
          users={users}
          loading={saving}
          onCancel={() => navigate("/jobs")}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
