import { useEffect, useMemo, useState } from "react";
import { createFeature, createPlan, getFeatures, getPlans, savePlanFeatures, updateFeature, updatePlan } from "../api/planService";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Table from "../components/Table";

const emptyPlan = { name: "", code: "", description: "", monthlyPrice: 0, halfYearlyPrice: 0, yearlyPrice: 0, status: "ACTIVE" };
const emptyFeature = { code: "", name: "", description: "", moduleGroup: "", status: "ACTIVE" };

export default function PlansPlaceholder() {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [featureForm, setFeatureForm] = useState(emptyFeature);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingFeature, setEditingFeature] = useState(null);
  const [featurePlan, setFeaturePlan] = useState(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [error, setError] = useState("");

  async function loadData() {
    const [planRows, featureRows] = await Promise.all([getPlans(), getFeatures()]);
    setPlans(planRows);
    setFeatures(featureRows);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.response?.data?.message || "Unable to load plans"));
  }, []);

  const groupedFeatures = useMemo(() => {
    return features.reduce((groups, feature) => {
      const group = feature.moduleGroup || "Other";
      groups[group] = groups[group] || [];
      groups[group].push(feature);
      return groups;
    }, {});
  }, [features]);

  function updatePlanForm(field, value) {
    setPlanForm((current) => ({ ...current, [field]: value }));
  }

  function updateFeatureForm(field, value) {
    setFeatureForm((current) => ({ ...current, [field]: value }));
  }

  async function submitPlan(event) {
    event.preventDefault();
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, planForm);
      } else {
        await createPlan(planForm);
      }
      setEditingPlan(null);
      setPlanForm(emptyPlan);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save plan");
    }
  }

  async function submitFeature(event) {
    event.preventDefault();
    try {
      if (editingFeature) {
        await updateFeature(editingFeature.id, featureForm);
      } else {
        await createFeature(featureForm);
      }
      setEditingFeature(null);
      setFeatureForm(emptyFeature);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save feature");
    }
  }

  function openPlanFeatureModal(plan) {
    setFeaturePlan(plan);
    setSelectedFeatureIds(plan.features?.map((planFeature) => planFeature.featureId) || []);
  }

  async function submitPlanFeatures() {
    try {
      await savePlanFeatures(featurePlan.id, selectedFeatureIds);
      setFeaturePlan(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save plan features");
    }
  }

  return (
    <>
      <PageHeader title="Plans" description="Manage subscription plans, feature catalog, and plan feature access." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Plans</h2>
            <Button onClick={() => { setEditingPlan({}); setPlanForm(emptyPlan); }}>Add Plan</Button>
          </div>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "code", label: "Code" },
              { key: "monthlyPrice", label: "Monthly", render: (row) => Number(row.monthlyPrice || 0).toLocaleString() },
              { key: "halfYearlyPrice", label: "Half-Yearly", render: (row) => Number(row.halfYearlyPrice || 0).toLocaleString() },
              { key: "yearlyPrice", label: "Yearly", render: (row) => Number(row.yearlyPrice || 0).toLocaleString() },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "features", label: "Features", render: (row) => row.features?.length || 0 },
              { key: "actions", label: "Actions", render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-9 px-3" type="button" onClick={() => { setEditingPlan(row); setPlanForm(row); }}>Edit</Button>
                  <Button className="min-h-9 px-3" variant="secondary" type="button" onClick={() => openPlanFeatureModal(row)}>Features</Button>
                </div>
              ) }
            ]}
            rows={plans}
          />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-950">Features</h2>
            <Button onClick={() => { setEditingFeature({}); setFeatureForm(emptyFeature); }}>Add Feature</Button>
          </div>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "code", label: "Code" },
              { key: "moduleGroup", label: "Group" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { key: "actions", label: "Actions", render: (row) => <Button className="min-h-9 px-3" type="button" onClick={() => { setEditingFeature(row); setFeatureForm(row); }}>Edit</Button> }
            ]}
            rows={features}
          />
        </section>
      </div>
      <Modal open={Boolean(editingPlan)} title={editingPlan?.id ? "Edit Plan" : "Add Plan"} onClose={() => setEditingPlan(null)}>
        <form className="space-y-4" onSubmit={submitPlan}>
          <Input label="Name" value={planForm.name} onChange={(event) => updatePlanForm("name", event.target.value)} required />
          <Input label="Code" value={planForm.code} onChange={(event) => updatePlanForm("code", event.target.value)} required />
          <Input label="Description" value={planForm.description || ""} onChange={(event) => updatePlanForm("description", event.target.value)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Monthly Price" type="number" value={planForm.monthlyPrice} onChange={(event) => updatePlanForm("monthlyPrice", Number(event.target.value))} />
            <Input label="Half-Yearly Price" type="number" value={planForm.halfYearlyPrice} onChange={(event) => updatePlanForm("halfYearlyPrice", Number(event.target.value))} />
            <Input label="Yearly Price" type="number" value={planForm.yearlyPrice} onChange={(event) => updatePlanForm("yearlyPrice", Number(event.target.value))} />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
            <select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={planForm.status} onChange={(event) => updatePlanForm("status", event.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingPlan(null)}>Cancel</Button><Button type="submit">Save Plan</Button></div>
        </form>
      </Modal>
      <Modal open={Boolean(editingFeature)} title={editingFeature?.id ? "Edit Feature" : "Add Feature"} onClose={() => setEditingFeature(null)}>
        <form className="space-y-4" onSubmit={submitFeature}>
          <Input label="Name" value={featureForm.name} onChange={(event) => updateFeatureForm("name", event.target.value)} required />
          <Input label="Code" value={featureForm.code} onChange={(event) => updateFeatureForm("code", event.target.value)} required />
          <Input label="Module Group" value={featureForm.moduleGroup} onChange={(event) => updateFeatureForm("moduleGroup", event.target.value)} required />
          <Input label="Description" value={featureForm.description || ""} onChange={(event) => updateFeatureForm("description", event.target.value)} />
          <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Status</span><select className="interactive-field h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={featureForm.status} onChange={(event) => updateFeatureForm("status", event.target.value)}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingFeature(null)}>Cancel</Button><Button type="submit">Save Feature</Button></div>
        </form>
      </Modal>
      <Modal open={Boolean(featurePlan)} title={`Features for ${featurePlan?.name || "Plan"}`} onClose={() => setFeaturePlan(null)}>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {Object.entries(groupedFeatures).map(([group, rows]) => (
            <section key={group}>
              <h3 className="mb-2 text-sm font-semibold text-slate-950">{group}</h3>
              <div className="space-y-2">
                {rows.map((feature) => (
                  <label key={feature.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedFeatureIds.includes(feature.id)} onChange={(event) => setSelectedFeatureIds((current) => event.target.checked ? [...current, feature.id] : current.filter((id) => id !== feature.id))} />
                    {feature.name}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setFeaturePlan(null)}>Cancel</Button><Button onClick={submitPlanFeatures}>Save Features</Button></div>
      </Modal>
    </>
  );
}
