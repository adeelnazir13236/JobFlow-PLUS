import {
  getPendingFollowUps,
  markFollowUpDone,
  recordFollowUpCall
} from "../services/followUp.service.js";
import { parseId } from "../utils/validation.js";

export async function listPendingFollowUps(_req, res) {
  const followUps = await getPendingFollowUps();
  res.json({ followUps });
}

export async function completeFollowUp(req, res) {
  const followUp = await markFollowUpDone(parseId(req.params.id, "Follow-up ID"), req.body.notes, req.user);
  res.json({ followUp });
}

export async function callFollowUp(req, res) {
  const result = await recordFollowUpCall(parseId(req.params.id, "Follow-up ID"), req.body, req.user);
  res.json(result);
}
