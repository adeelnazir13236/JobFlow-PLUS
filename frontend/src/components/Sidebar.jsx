import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getDashboard } from "../api/dashboardService";
import { getMe } from "../api/userService";
import {
  AddIcon,
  CalendarIcon,
  CustomersIcon,
  DashboardIcon,
  FollowUpIcon,
  JobsIcon,
  PaymentIcon,
  PhoneIcon,
  RevenueIcon,
  SettingsIcon,
  UsersIcon
} from "./Icons";

const groups = [
  {
    label: "Overview",
    links: [
      { to: "/", label: "Dashboard", icon: DashboardIcon, feature: "DASHBOARD" },
      { to: "/calendar", label: "Calendar", icon: CalendarIcon }
    ]
  },
  {
    label: "Operations",
    links: [
      { to: "/customers", label: "Customers", icon: CustomersIcon, feature: "CUSTOMERS" },
      { to: "/customers/add", label: "Add Customer", icon: AddIcon, feature: "CUSTOMERS" },
      { to: "/jobs", label: "Jobs", icon: JobsIcon, feature: "JOBS" },
      { to: "/jobs/schedule", label: "Schedule Job", icon: AddIcon, feature: "JOBS" },
      { to: "/quotations", label: "Quotations", icon: PaymentIcon, feature: "QUOTATIONS" },
      { to: "/contracts", label: "Contracts", icon: JobsIcon, feature: "CONTRACTS" },
      { to: "/contracts/add", label: "Add Contract", icon: AddIcon, feature: "CONTRACTS" },
      { to: "/technician", label: "Technician Workspace", icon: JobsIcon, feature: "TECHNICIAN_WORKSPACE" },
      { to: "/call-logs", label: "Call Logs", icon: PhoneIcon, feature: "CALL_LOGS" },
      { to: "/followups", label: "Follow-ups", icon: FollowUpIcon, feature: "FOLLOW_UPS" },
      { to: "/service-requests", label: "Service Requests", icon: FollowUpIcon, feature: "CUSTOMER_PORTAL" }
    ]
  },
  {
    label: "Finance",
    links: [
      { to: "/payments", label: "Payments", icon: PaymentIcon, feature: "PAYMENTS" },
      { to: "/payments/add", label: "Add Payment", icon: AddIcon, feature: "PAYMENTS" },
      { to: "/invoices", label: "Invoices", icon: PaymentIcon, feature: "INVOICES" }
    ]
  },
  {
    label: "Reports",
    links: [
      { to: "/reports", label: "Executive Dashboard", icon: RevenueIcon, feature: "REPORTS" },
      { to: "/reports/financial", label: "Financial Reports", icon: PaymentIcon, feature: "REPORTS" },
      { to: "/reports/contracts", label: "Contract Reports", icon: JobsIcon, feature: "REPORTS" },
      { to: "/reports/jobs", label: "Job Reports", icon: CalendarIcon, feature: "REPORTS" },
      { to: "/reports/customers", label: "Customer Reports", icon: CustomersIcon, feature: "REPORTS" },
      { to: "/reports/service-requests", label: "Request Reports", icon: FollowUpIcon, feature: "REPORTS" }
    ]
  },
  {
    label: "Messaging",
    links: [
      { to: "/whatsapp/settings", label: "WhatsApp Settings", icon: PhoneIcon, feature: "WHATSAPP" },
      { to: "/whatsapp/templates", label: "WhatsApp Templates", icon: SettingsIcon, feature: "WHATSAPP" },
      { to: "/whatsapp/logs", label: "WhatsApp Logs", icon: PhoneIcon, feature: "WHATSAPP" }
    ]
  },
  {
    label: "Platform",
    systemOnly: true,
    links: [
      { to: "/system", label: "System Dashboard", icon: DashboardIcon },
      { to: "/organizations", label: "Organizations", icon: UsersIcon },
      { to: "/organizations/add", label: "Add Organization", icon: AddIcon },
      { to: "/organizations/admins/add", label: "Add Org Admin", icon: AddIcon },
      { to: "/organization-billing", label: "Organization Billing", icon: PaymentIcon },
      { to: "/users", label: "Users", icon: UsersIcon },
      { to: "/plans", label: "Plans", icon: SettingsIcon }
    ]
  },
  {
    label: "Admin",
    orgOnly: true,
    links: [
      { to: "/users", label: "Users", icon: UsersIcon },
      { to: "/settings", label: "Settings", icon: SettingsIcon }
    ]
  }
];

export default function Sidebar({ open, onClose }) {
  const [badges, setBadges] = useState({ jobs: 0, followUps: 0, payments: 0 });
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      try {
        const user = await getMe();

        if (!mounted) {
          return;
        }

        setCurrentUser(user);
        localStorage.setItem("user", JSON.stringify(user));
      } catch {
        // Auth interceptor handles expired sessions.
      }
    }

    async function loadBadges() {
      try {
        const dashboard = await getDashboard();

        if (!mounted) {
          return;
        }

        setBadges({
          jobs: dashboard.cards.todaysScheduledJobs || 0,
          followUps: dashboard.cards.pendingFollowUps || 0,
          payments: dashboard.cards.pendingPayments || 0
        });
      } catch {
        // Navigation should remain usable even if badge data is unavailable.
      }
    }

    loadCurrentUser();
    loadBadges();

    return () => {
      mounted = false;
    };
  }, []);

  const linkClass = ({ isActive }) =>
    `interactive-nav group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? "bg-[var(--brand-blue)] text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-[var(--brand-blue)]"
    }`;

  const visibleGroups = groups.filter((group) => {
    if (group.systemOnly) {
      return currentUser?.role === "SYSTEM_ADMIN";
    }

    if (group.orgOnly) {
      return currentUser?.role !== "SYSTEM_ADMIN";
    }

    return true;
  });
  const userFeatures = new Set(currentUser?.features || []);
  const canSeeLink = (link) => currentUser?.role === "SYSTEM_ADMIN" || !link.feature || userFeatures.has(link.feature);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 md:hidden ${open ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-4 py-5 shadow-sm transition-transform md:static md:z-auto md:block md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white shadow-sm">
            <img src="/logo.png" alt="JobFlow" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <div className="text-xl font-bold text-[var(--brand-navy)]">JobFlow</div>
            <div className="text-sm text-slate-500">Schedule. Manage. Complete.</div>
          </div>
        </div>
        <nav className="space-y-5">
          {visibleGroups.map((group) => (
            <section key={group.label}>
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.links.filter(canSeeLink).map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClass} onClick={onClose} end={link.to === "/"}>
                    {({ isActive }) => (
                      <>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[var(--brand-blue)]"
                        }`}>
                          <link.icon />
                        </span>
                        <span>{link.label}</span>
                        {link.to === "/jobs" && badges.jobs > 0 && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-blue-50 text-[var(--brand-blue)] dark:bg-blue-950 dark:text-blue-200"}`}>
                            {badges.jobs}
                          </span>
                        )}
                        {link.to === "/followups" && badges.followUps > 0 && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"}`}>
                            {badges.followUps}
                          </span>
                        )}
                        {link.to === "/payments" && badges.payments > 0 && (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-white/20 text-white" : "bg-emerald-50 text-[var(--brand-green)] dark:bg-emerald-950 dark:text-emerald-200"}`}>
                            {badges.payments}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>
    </>
  );
}
