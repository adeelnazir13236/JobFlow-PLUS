import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getContracts } from "../api/contractService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const statuses = ["ALL", "DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "EXPIRED", "CANCELLED"];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function contractProgress(contract) {
  const total = contract.services?.reduce((sum, service) => sum + Number(service.totalJobs || 0), 0) || 0;
  const done = contract.services?.reduce((sum, service) => sum + Number(service.completedJobs || 0), 0) || 0;
  return total ? `${done}/${total}` : "0/0";
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadContracts() {
      try {
        setLoading(true);
        setError("");
        setContracts(await getContracts());
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load contracts");
      } finally {
        setLoading(false);
      }
    }

    loadContracts();
  }, []);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      if (status !== "ALL" && contract.status !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [contract.contractNumber, contract.title, contract.customer?.name, contract.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [contracts, search, status]);

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Manage AMC contracts, recurring schedules, and billing rules."
        action={<Link to="/contracts/add"><Button>Create Contract</Button></Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Button key={item} variant={status === item ? "primary" : "secondary"} onClick={() => setStatus(item)}>
            {item}
          </Button>
        ))}
      </div>
      <div className="mb-4 max-w-xl">
        <Input label="Search contracts" placeholder="Search by number, customer, title, or status" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading contracts...</Alert>
      ) : (
        <Table
          columns={[
            { key: "contractNumber", label: "Contract" },
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "N/A" },
            { key: "title", label: "Title" },
            { key: "startDate", label: "Start", render: (row) => formatDate(row.startDate) },
            { key: "endDate", label: "End", render: (row) => formatDate(row.endDate) },
            { key: "contractValue", label: "Value", render: (row) => formatAmount(row.contractValue) },
            { key: "progress", label: "Progress", render: contractProgress },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <Link className="interactive-link rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/contracts/${row.id}`}>
                  View
                </Link>
              )
            }
          ]}
          rows={filteredContracts}
          emptyMessage="No contracts found"
        />
      )}
    </>
  );
}
