import { getDashboardSummary } from "../services/dashboard.service.js";

export async function showDashboard(_req, res) {
  const dashboard = await getDashboardSummary();
  res.json({ dashboard });
}
