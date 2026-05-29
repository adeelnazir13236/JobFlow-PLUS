import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";
import { users } from "../data/mockData";

export default function Users() {
  return (
    <>
      <PageHeader title="Users" description="Manage admins, agents, and staff accounts." />
      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
        ]}
        rows={users}
      />
    </>
  );
}
