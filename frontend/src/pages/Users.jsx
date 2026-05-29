import { useEffect, useState } from "react";
import { getUsers } from "../api/userService";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      const rows = await getUsers();

      if (mounted) {
        setUsers(rows);
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader title="Users" description="Manage admins, agents, and staff accounts." />
      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "organization", label: "Organization", render: (row) => row.organization?.name || "System" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> }
        ]}
        rows={users}
      />
    </>
  );
}
