import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import { getJob, updateJob } from "../api/jobService";
import { getUsers } from "../api/userService";
import Alert from "../components/Alert";
import JobForm from "../components/JobForm";
import JobCompletionModal from "../components/JobCompletionModal";
import PageHeader from "../components/PageHeader";

export default function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [job, setJob] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");
        const [jobData, customerData, userData] = await Promise.all([
          getJob(id),
          getCustomers(),
          getUsers()
        ]);
        setJob(jobData);
        setCustomers(customerData);
        setUsers(userData);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load job");
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [id]);

  async function handleSubmit(payload) {
    if (job?.status !== "COMPLETED" && payload.status === "COMPLETED") {
      setPendingPayload(payload);
      return;
    }

    try {
      setSaving(true);
      setError("");
      await updateJob(id, payload);
      navigate("/jobs");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update job");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmComplete({ remarks }) {
    if (!pendingPayload) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      await updateJob(id, { ...pendingPayload, remarks });
      setPendingPayload(null);
      navigate("/jobs");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Edit / Reschedule Job" description="Update assignment, date, time, status, or remarks." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading job...</Alert>
      ) : (
        job && (
          <JobForm
            job={job}
            customers={customers}
            users={users}
            loading={saving}
            onCancel={() => navigate("/jobs")}
            onSubmit={handleSubmit}
          />
        )
      )}
      <JobCompletionModal
        job={pendingPayload ? { ...job, ...pendingPayload } : null}
        loading={saving}
        onClose={() => setPendingPayload(null)}
        onConfirm={handleConfirmComplete}
      />
    </>
  );
}
