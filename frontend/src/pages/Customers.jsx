import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomers } from "../api/customerService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        setError("");
        setCustomers(await getCustomers());
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load customers");
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.whatsapp, customer.email, customer.area, customer.city]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [customers, search]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer profiles, locations, and system details."
        action={
          <Link to="/customers/add">
            <Button>Add Customer</Button>
          </Link>
        }
      />
      <div className="mb-4 max-w-xl">
        <Input
          label="Search customers"
          placeholder="Search by name, phone, email, area, or city"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Alert type="info">Loading customers...</Alert>
      ) : (
      <Table
        columns={[
          { key: "name", label: "Name", render: (row) => <Link className="font-medium text-slate-950" to={`/customers/${row.id}`}>{row.name}</Link> },
          { key: "phone", label: "Phone" },
          { key: "area", label: "Area" },
          { key: "city", label: "City" },
          { key: "jobPaymentAmount", label: "Job Amount", render: (row) => formatAmount(row.jobPaymentAmount) },
          { key: "systems", label: "Systems", render: (row) => row.systems?.length || 0 },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
          { key: "actions", label: "Actions", render: (row) => <Link className="font-medium text-slate-950" to={`/customers/${row.id}/edit`}>Edit</Link> }
        ]}
        rows={filteredCustomers}
        emptyMessage={search ? "No customers match your search" : "No customers found"}
      />
      )}
    </>
  );
}
