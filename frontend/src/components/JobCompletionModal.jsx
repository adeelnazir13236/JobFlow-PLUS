import { useEffect, useState } from "react";
import Button from "./Button";
import Modal from "./Modal";

export default function JobCompletionModal({ job, loading, onClose, onConfirm }) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setRemarks(job?.remarks || "");
  }, [job]);

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({ remarks });
  }

  return (
    <Modal open={Boolean(job)} title={job ? `Complete Job #${job.id}` : "Complete Job"} onClose={onClose}>
      {job && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="interactive-card rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="font-semibold text-slate-950">{job.customer?.name || "Customer"}</div>
            <div className="mt-1 text-slate-500">
              Marking this job complete will create the automatic payment record and follow-up reminder when applicable.
            </div>
          </section>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Completion Remarks</span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              className="interactive-field min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Completing..." : "Complete Job"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
