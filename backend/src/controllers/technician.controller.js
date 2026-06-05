import {
  addJobAttachment,
  addJobNote,
  checkInTechnicianJob,
  checkOutTechnicianJob,
  completeTechnicianJob,
  getTechnicianDashboard,
  getTechnicianJob,
  getTechnicianJobs,
  getTechnicianProfile,
  pauseTechnicianJob,
  resumeTechnicianJob,
  saveJobSignature,
  startTechnicianJob,
  updateChecklistItem,
  updateJobNote
} from "../services/technician.service.js";
import { parseId } from "../utils/validation.js";

export async function dashboard(req, res) {
  res.json({ dashboard: await getTechnicianDashboard(req.user) });
}

export async function jobs(req, res) {
  res.json({ jobs: await getTechnicianJobs(req.user, req.query) });
}

export async function showJob(req, res) {
  res.json({ job: await getTechnicianJob(parseId(req.params.id, "Job ID"), req.user) });
}

export async function startJob(req, res) {
  res.json({ job: await startTechnicianJob(parseId(req.params.id, "Job ID"), req.user) });
}

export async function pauseJob(req, res) {
  res.json({ job: await pauseTechnicianJob(parseId(req.params.id, "Job ID"), req.user, req.body.notes) });
}

export async function resumeJob(req, res) {
  res.json({ job: await resumeTechnicianJob(parseId(req.params.id, "Job ID"), req.user) });
}

export async function completeJob(req, res) {
  res.json({ job: await completeTechnicianJob(parseId(req.params.id, "Job ID"), req.user, req.body.remarks) });
}

export async function checkInJob(req, res) {
  const result = await checkInTechnicianJob(parseId(req.params.id, "Job ID"), req.user, req.body);
  res.status(201).json(result);
}

export async function checkOutJob(req, res) {
  const result = await checkOutTechnicianJob(parseId(req.params.id, "Job ID"), req.user, req.body);
  res.status(201).json(result);
}

export async function addNote(req, res) {
  const note = await addJobNote(parseId(req.params.id, "Job ID"), req.user, req.body.note);
  res.status(201).json({ note });
}

export async function editNote(req, res) {
  res.json({
    note: await updateJobNote(
      parseId(req.params.id, "Job ID"),
      parseId(req.params.noteId, "Note ID"),
      req.user,
      req.body.note
    )
  });
}

export async function uploadAttachment(req, res) {
  const attachment = await addJobAttachment(parseId(req.params.id, "Job ID"), req.user, req.body);
  res.status(201).json({ attachment });
}

export async function captureSignature(req, res) {
  const signature = await saveJobSignature(parseId(req.params.id, "Job ID"), req.user, req.body);
  res.status(201).json({ signature });
}

export async function updateChecklist(req, res) {
  res.json({
    item: await updateChecklistItem(
      parseId(req.params.id, "Job ID"),
      parseId(req.params.itemId, "Checklist item ID"),
      req.user,
      req.body.completed
    )
  });
}

export async function profile(req, res) {
  res.json({ profile: await getTechnicianProfile(req.user) });
}
