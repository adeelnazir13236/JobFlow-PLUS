import {
  completeJob,
  createJob,
  getCalendarJobs,
  getJobById,
  getJobs,
  updateJob
} from "../services/job.service.js";
import { parseId } from "../utils/validation.js";

export async function listJobs(_req, res) {
  const jobs = await getJobs();
  res.json({ jobs });
}

export async function listCalendarJobs(_req, res) {
  const jobs = await getCalendarJobs();
  res.json({ jobs });
}

export async function getJob(req, res) {
  const job = await getJobById(parseId(req.params.id, "Job ID"));
  res.json({ job });
}

export async function storeJob(req, res) {
  const job = await createJob(req.body, req.user);
  res.status(201).json({ job });
}

export async function editJob(req, res) {
  const job = await updateJob(parseId(req.params.id, "Job ID"), req.body, req.user);
  res.json({ job });
}

export async function markJobComplete(req, res) {
  const job = await completeJob(parseId(req.params.id, "Job ID"), req.body.remarks, req.user);
  res.json({ job });
}
