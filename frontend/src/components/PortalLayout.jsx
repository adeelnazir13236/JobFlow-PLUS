import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { portalMe } from "../api/portalApi";
import Button from "./Button";

const links = [
  ["/portal/dashboard", "Dashboard"],
  ["/portal/quotations", "Quotations"],
  ["/portal/contracts", "Contracts"],
  ["/portal/jobs", "Jobs"],
  ["/portal/invoices", "Invoices"],
  ["/portal/payments", "Payments"],
  ["/portal/service-requests", "Service Requests"]
];

export default function PortalLayout() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("portalUser") || "null"));
  const navigate = useNavigate();

  useEffect(() => {
    portalMe()
      .then((nextUser) => {
        setUser(nextUser);
        localStorage.setItem("portalUser", JSON.stringify(nextUser));
      })
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("portalToken");
    localStorage.removeItem("portalUser");
    navigate("/portal/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <div className="text-lg font-bold text-[var(--brand-navy)]">{user?.organization?.name || "Customer Portal"}</div>
            <div className="text-sm text-slate-500">{user?.customer?.name || user?.name}</div>
          </div>
          <Button variant="secondary" onClick={logout}>Logout</Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-[var(--brand-blue)] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
