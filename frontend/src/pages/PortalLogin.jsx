import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { portalLogin } from "../api/portalApi";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";

export default function PortalLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const result = await portalLogin(form);
      localStorage.setItem("portalToken", result.token);
      localStorage.setItem("portalUser", JSON.stringify(result.user));
      navigate("/portal/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}>
        <div className="mb-5">
          <div className="text-2xl font-bold text-[var(--brand-navy)]">Customer Portal</div>
          <p className="mt-1 text-sm text-slate-500">Sign in with your email or phone.</p>
        </div>
        {error && <div className="mb-4"><Alert>{error}</Alert></div>}
        <div className="space-y-4">
          <Input label="Email or Phone" value={form.login} onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))} required />
          <Input label="Password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
        </div>
        <Button className="mt-5 w-full" type="submit" disabled={loading}>{loading ? "Signing in..." : "Login"}</Button>
        <div className="mt-4 text-center text-sm text-slate-500">Forgot password support is coming soon.</div>
      </form>
    </div>
  );
}
