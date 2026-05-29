export default function Table({ columns, rows, emptyMessage = "No records found" }) {
  const renderCell = (column, row) => column.render ? column.render(row) : row[column.key];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {rows.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-400">
            -
          </div>
          <div className="mt-3 text-sm font-medium text-slate-700">{emptyMessage}</div>
          <div className="mt-1 max-w-sm text-xs text-slate-500">Records will appear here as soon as they are added or match the current filters.</div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 md:hidden">
          {rows.map((row) => (
            <article key={row.id} className="interactive-card bg-white p-4">
              <dl className="space-y-3">
                {columns.map((column) => (
                  <div key={column.key} className={column.key === "actions" ? "space-y-2" : "flex items-start justify-between gap-4"}>
                    <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</dt>
                    <dd className={column.key === "actions" ? "text-sm font-medium text-slate-700" : "min-w-0 text-right text-sm font-medium text-slate-700"}>{renderCell(column, row)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="interactive-row hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                    {renderCell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
