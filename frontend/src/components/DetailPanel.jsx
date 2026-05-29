export function DetailPanel({ title, children, className = "" }) {
  return (
    <section className={`interactive-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="text-base font-semibold text-slate-950">{title}</h2>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function DetailGrid({ children, columns = "md:grid-cols-2" }) {
  return (
    <dl className={`grid gap-4 text-sm ${columns}`}>
      {children}
    </dl>
  );
}

export function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{children || "N/A"}</dd>
    </div>
  );
}
