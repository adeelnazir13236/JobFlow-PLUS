import {
  createCallLog,
  getCallLogById,
  getCallLogs,
  getCustomerCallLogs,
  updateCallLog
} from "../services/callLog.service.js";
import { parseId } from "../utils/validation.js";

export async function listCallLogs(req, res) {
  const callLogs = await getCallLogs(req.query, req.user);
  res.json({ callLogs });
}

export async function getCallLog(req, res) {
  const callLog = await getCallLogById(parseId(req.params.id, "Call log ID"), req.user);
  res.json({ callLog });
}

export async function storeCallLog(req, res) {
  const callLog = await createCallLog(req.body, req.user);
  res.status(201).json({ callLog });
}

export async function editCallLog(req, res) {
  const callLog = await updateCallLog(parseId(req.params.id, "Call log ID"), req.body, req.user);
  res.json({ callLog });
}

export async function listCustomerCallLogs(req, res) {
  const callLogs = await getCustomerCallLogs(parseId(req.params.id, "Customer ID"), req.user);
  res.json({ callLogs });
}
