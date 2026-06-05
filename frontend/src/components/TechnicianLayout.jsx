import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Button from "./Button";
import {
  CalendarIcon,
  DashboardIcon,
  JobsIcon,
  UsersIcon
} from "./Icons";

const links = [
  { to: "/technician", label: "Dashboard", icon: DashboardIcon, end: true },
  { to: "/technician/jobs", label: "My Jobs", icon: JobsIcon },
  { to: "/technician/jobs/today", label: "Today", icon: CalendarIcon },
  { to: "/technician/jobs/upcoming", label: "Upcoming", icon: CalendarIcon },
  { to: "/technician/jobs/completed", label: "Completed", icon: JobsIcon },
  { to: "/technician/profile", label: "Profile", icon: UsersIcon }
];

export default function TechnicianLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="JobFlow" className="h-10 w-10 rounded-md object-contain" />
            <div>
              <div className="text-base font-semibold text-slate-950">Technician Workspace</div>
              <div className="text-xs text-slate-500">{user?.organization?.name || "JobFlow PLUS"}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>Logout</Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                  isActive ? "bg-[var(--brand-blue)] text-white" : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-[var(--brand-blue)]"
                }`
              }
            >
              <link.icon />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
