import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/Button";
import Input from "../components/Input";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user?.role === "STAFF" && data.user?.features?.includes("TECHNICIAN_WORKSPACE")) {
        navigate("/technician");
        return;
      }
      navigate("/");
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed");
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_500px]">
      <section className="relative hidden overflow-hidden bg-[var(--brand-navy)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,100,244,0.32),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(10,166,106,0.22),transparent_30%)]" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl">
              <img src="/logo.png" alt="JobFlow" className="h-16 w-16 object-contain" />
            </div>
            <div>
              <div className="text-3xl font-bold">JobFlow</div>
              <div className="mt-1 text-sm font-medium uppercase tracking-[0.22em] text-blue-100">
                Schedule. Manage. Complete. Repeat.
              </div>
            </div>
          </div>
          <h1 className="mt-16 max-w-3xl text-5xl font-semibold leading-tight">
            Field operations, customer calls, and follow-ups in one professional workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Keep every customer, scheduled job, completion, and follow-up moving through a clear daily workflow.
          </p>
        </div>
        <div className="relative grid max-w-3xl grid-cols-3 gap-4">
          {[
            ["Schedule", "Plan jobs"],
            ["Manage", "Track calls"],
            ["Complete", "Close follow-ups"]
          ].map(([title, detail], index) => (
            <div key={title} className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-lg backdrop-blur">
              <div className={`h-2 w-10 rounded-full ${index === 0 ? "bg-[var(--brand-blue)]" : index === 1 ? "bg-[var(--brand-orange)]" : "bg-[var(--brand-green)]"}`} />
              <div className="mt-4 text-lg font-semibold">{title}</div>
              <div className="mt-1 text-sm text-blue-100">{detail}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src="/logo.png" alt="JobFlow" className="h-14 w-14 object-contain" />
            <div>
              <div className="text-2xl font-bold text-[var(--brand-navy)]">JobFlow</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Schedule. Manage. Complete.</div>
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <img src="/logo.png" alt="JobFlow" className="mb-4 h-28 w-28 object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--brand-navy)]">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage customers, jobs, calls, and follow-ups.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-blue-50 px-2 py-2 font-medium text-[var(--brand-blue)]">Schedule</div>
            <div className="rounded-md bg-orange-50 px-2 py-2 font-medium text-[var(--brand-orange)]">Manage</div>
            <div className="rounded-md bg-emerald-50 px-2 py-2 font-medium text-[var(--brand-green)]">Complete</div>
          </div>
          {message && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
        </div>
      </section>
    </main>
  );
}
