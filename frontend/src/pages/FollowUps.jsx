import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPendingFollowUps, recordFollowUpCall } from "../api/followUpService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const responses = ["INTERESTED", "NOT_INTERESTED", "CALL_LATER", "WRONG_NUMBER", "NO_ANSWER"];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [callForm, setCallForm] = useState({ response: "INTERESTED", notes: "", nextCallDate: "", scheduledJobDate: "" });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  async function loadFollowUps() {
    try {
      setLoading(true);
      setError("");
      setFollowUps(await getPendingFollowUps());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load follow-up reminders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFollowUps();
  }, []);

  const filteredFollowUps = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return followUps;
    }

    return followUps.filter((followUp) =>
      [
        followUp.customer?.name,
        followUp.customer?.phone,
        followUp.customer?.whatsapp,
        followUp.customer?.area,
        followUp.customer?.city,
        formatDate(followUp.job?.scheduledDate),
        formatDate(followUp.followUpDate),
        followUp.status,
        followUp.notes
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [followUps, search]);

  function openCallModal(followUp) {
    setSelectedFollowUp(followUp);
    setCallForm({
      response: "INTERESTED",
      notes: followUp.notes || "",
      nextCallDate: "",
      scheduledJobDate: ""
    });
  }

  function updateCallForm(field, value) {
    setCallForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCallSubmit(event) {
    event.preventDefault();

    if (!selectedFollowUp) {
      return;
    }

    try {
      setActionLoadingId(selectedFollowUp.id);
      setError("");
      await recordFollowUpCall(selectedFollowUp.id, {
        response: callForm.response,
        notes: callForm.notes || undefined,
        nextCallDate: callForm.nextCallDate,
        scheduledJobDate: callForm.response === "INTERESTED" ? callForm.scheduledJobDate : undefined
      });
      setSelectedFollowUp(null);
      await loadFollowUps();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record follow-up call");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Follow-up Reminders"
        description="Customers whose follow-up date is today or overdue."
        action={
          <Link to="/jobs/schedule">
            <Button>Schedule New Job</Button>
          </Link>
        }
      />
      <div className="mb-4 max-w-xl">
        <Input
          label="Search follow-ups"
          placeholder="Search by customer, phone, city, date, status, or notes"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading follow-up reminders...</Alert>
      ) : (
        <Table
          columns={[
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "phone", label: "Phone", render: (row) => row.customer?.phone || "N/A" },
            { key: "lastJobDate", label: "Last Job", render: (row) => formatDate(row.job?.scheduledDate) },
            { key: "followUpDate", label: "Follow-up Date", render: (row) => formatDate(row.followUpDate) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "updatedBy", label: "Updated By", render: (row) => row.updatedBy?.name || "N/A" },
            { key: "notes", label: "Notes", render: (row) => row.notes || "N/A" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-9 px-3" onClick={() => openCallModal(row)} disabled={actionLoadingId === row.id}>
                    {actionLoadingId === row.id ? "Saving..." : "Call"}
                  </Button>
                  <Link
                    className="interactive-link inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    to="/jobs/schedule"
                  >
                    Schedule Job
                  </Link>
                </div>
              )
            }
          ]}
          rows={filteredFollowUps}
          emptyMessage="No follow-ups due today or overdue"
        />
      )}
      <Modal
        open={Boolean(selectedFollowUp)}
        title="Follow-up Call"
        onClose={() => setSelectedFollowUp(null)}
      >
        {selectedFollowUp && (
          <form onSubmit={handleCallSubmit} className="space-y-4">
            <section className="interactive-card rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <h3 className="font-semibold text-slate-950">{selectedFollowUp.customer?.name}</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-slate-950">{selectedFollowUp.customer?.phone || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">WhatsApp</dt>
                  <dd className="font-medium text-slate-950">{selectedFollowUp.customer?.whatsapp || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">City</dt>
                  <dd className="font-medium text-slate-950">{selectedFollowUp.customer?.city || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Follow-up Date</dt>
                  <dd className="font-medium text-slate-950">{formatDate(selectedFollowUp.followUpDate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Job Date</dt>
                  <dd className="font-medium text-slate-950">{formatDate(selectedFollowUp.job?.scheduledDate)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Job Status</dt>
                  <dd className="font-medium text-slate-950">{selectedFollowUp.job?.status || "N/A"}</dd>
                </div>
              </dl>
            </section>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Response</span>
              <select
                value={callForm.response}
                onChange={(event) => updateCallForm("response", event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              >
                {responses.map((response) => (
                  <option key={response} value={response}>{response}</option>
                ))}
              </select>
            </label>
            {callForm.response === "INTERESTED" && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Schedule Job Date</span>
                <input
                  type="date"
                  value={callForm.scheduledJobDate}
                  onChange={(event) => updateCallForm("scheduledJobDate", event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Next Call Date</span>
              <input
                type="date"
                value={callForm.nextCallDate}
                onChange={(event) => updateCallForm("nextCallDate", event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Call Notes</span>
              <textarea
                value={callForm.notes}
                onChange={(event) => updateCallForm("notes", event.target.value)}
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedFollowUp(null)}>Cancel</Button>
              <Button type="submit" disabled={actionLoadingId === selectedFollowUp.id}>
                {actionLoadingId === selectedFollowUp.id ? "Saving..." : "Save Call"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
