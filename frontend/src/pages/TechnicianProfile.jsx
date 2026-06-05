import { useEffect, useState } from "react";
import { getTechnicianProfile } from "../api/technicianService";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

export default function TechnicianProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setProfile(await getTechnicianProfile());
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load profile");
      }
    }

    loadProfile();
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!profile) return <Alert type="info">Loading profile...</Alert>;

  const rows = [
    ["Name", profile.user?.name],
    ["Email", profile.user?.email],
    ["Phone", profile.phone || "N/A"],
    ["Employee Code", profile.employeeCode || "N/A"],
    ["Designation", profile.designation || "Technician"],
    ["Organization", profile.organization?.name || "N/A"]
  ];

  return (
    <>
      <PageHeader title="Technician Profile" description="Read-only field operations profile." />
      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">Profile</h2>
          <StatusBadge status={profile.active ? "ACTIVE" : "INACTIVE"} />
        </div>
        <dl className="space-y-4 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
