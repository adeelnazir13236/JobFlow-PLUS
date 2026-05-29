import { getDashboardSummary } from "../services/dashboard.service.js";

export async function showDashboard(req, res) {
  const dashboard = await getDashboardSummary(req.user);
  res.json({ dashboard });
}
