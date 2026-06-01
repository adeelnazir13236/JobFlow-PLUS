import {
  convertServiceRequestToJob,
  getServiceRequestById,
  getServiceRequests,
  updateServiceRequestStatus
} from "../services/serviceRequest.service.js";
import { parseId } from "../utils/validation.js";

export async function listServiceRequests(req, res) {
  res.json({ serviceRequests: await getServiceRequests(req.user, req.query) });
}

export async function showServiceRequest(req, res) {
  res.json({ serviceRequest: await getServiceRequestById(parseId(req.params.id, "Service request ID"), req.user) });
}

export async function changeServiceRequestStatus(req, res) {
  res.json({ serviceRequest: await updateServiceRequestStatus(parseId(req.params.id, "Service request ID"), req.body.status, req.user) });
}

export async function convertServiceRequest(req, res) {
  res.json({ serviceRequest: await convertServiceRequestToJob(parseId(req.params.id, "Service request ID"), req.body, req.user) });
}
