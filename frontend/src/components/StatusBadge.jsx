const styles = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
  RESCHEDULED: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  PARTIAL_PAID: "bg-sky-50 text-sky-700 ring-sky-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REFUNDED: "bg-violet-50 text-violet-700 ring-violet-200",
  DONE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  SKIPPED: "bg-slate-100 text-slate-700 ring-slate-200"
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[status] || styles.INACTIVE}`}>
      {status}
    </span>
  );
}
