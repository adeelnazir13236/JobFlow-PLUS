import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { convertQuotationToContract, convertQuotationToJob, getQuotations, updateQuotationStatus } from "../api/quotationService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const statuses = ["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  async function loadQuotations() {
    try {
      setLoading(true);
      setError("");
      setQuotations(await getQuotations());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load quotations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotations();
  }, []);

  const filteredQuotations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quotations.filter((quotation) => {
      if (status !== "ALL" && quotation.status !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [quotation.quotationNumber, quotation.customer?.name, quotation.title, quotation.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [quotations, search, status]);

  async function runAction(quotation, action) {
    try {
      setActionLoadingId(quotation.id);
      setError("");
      await action();
      await loadQuotations();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Create estimates and convert accepted work into jobs or draft contracts."
        action={<Link to="/quotations/add"><Button>Create Quotation</Button></Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Button key={item} variant={status === item ? "primary" : "secondary"} onClick={() => setStatus(item)}>
            {item}
          </Button>
        ))}
      </div>
      <div className="mb-4 max-w-xl">
        <Input label="Search quotations" placeholder="Search by number, customer, title, or status" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading quotations...</Alert>
      ) : (
        <Table
          columns={[
            { key: "quotationNumber", label: "Quotation" },
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "title", label: "Title" },
            { key: "quotationDate", label: "Date", render: (row) => formatDate(row.quotationDate) },
            { key: "validUntil", label: "Valid Until", render: (row) => formatDate(row.validUntil) },
            { key: "totalAmount", label: "Total", render: (row) => formatAmount(row.totalAmount) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/quotations/${row.id}`}>View</Link>
                  <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/quotations/${row.id}/edit`}>Edit</Link>
                  {row.status === "DRAFT" && <Button className="min-h-9 px-3" variant="secondary" disabled={actionLoadingId === row.id} onClick={() => runAction(row, () => updateQuotationStatus(row.id, "SENT"))}>Sent</Button>}
                  {row.status === "SENT" && (
                    <>
                      <Button className="min-h-9 px-3" variant="success" disabled={actionLoadingId === row.id} onClick={() => runAction(row, () => updateQuotationStatus(row.id, "ACCEPTED"))}>Accept</Button>
                      <Button className="min-h-9 px-3" variant="danger" disabled={actionLoadingId === row.id} onClick={() => runAction(row, () => updateQuotationStatus(row.id, "REJECTED"))}>Reject</Button>
                    </>
                  )}
                  {row.status === "ACCEPTED" && (
                    <>
                      <Button className="min-h-9 px-3" disabled={actionLoadingId === row.id} onClick={() => runAction(row, () => convertQuotationToJob(row.id))}>To Job</Button>
                      <Button className="min-h-9 px-3" variant="secondary" disabled={actionLoadingId === row.id} onClick={() => runAction(row, () => convertQuotationToContract(row.id))}>To Contract</Button>
                    </>
                  )}
                </div>
              )
            }
          ]}
          rows={filteredQuotations}
          emptyMessage="No quotations found"
        />
      )}
    </>
  );
}
