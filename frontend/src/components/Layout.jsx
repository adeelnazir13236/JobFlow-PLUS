import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Button from "./Button";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button variant="secondary" className="md:hidden" onClick={() => setSidebarOpen(true)}>
                Menu
              </Button>
              <img src="/logo.png" alt="JobFlow" className="h-9 w-9 rounded-md object-contain md:hidden" />
              <div>
                <div className="text-sm font-semibold text-[var(--brand-navy)] dark:text-slate-100">JobFlow Operations</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Customers, jobs, calls, and follow-ups</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
