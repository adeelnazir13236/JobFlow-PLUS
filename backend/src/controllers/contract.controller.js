import {
  activateContract,
  addBillingRule,
  addContractService,
  createContract,
  deleteContract,
  getContractById,
  getContractInvoices,
  getContracts,
  setContractStatus,
  updateBillingRule,
  updateContract,
  updateContractService
} from "../services/contract.service.js";
import { parseId } from "../utils/validation.js";

export async function listContracts(req, res) {
  const contracts = await getContracts(req.user, req.query);
  res.json({ contracts });
}

export async function getContract(req, res) {
  const contract = await getContractById(parseId(req.params.id, "Contract ID"), req.user);
  res.json({ contract });
}

export async function storeContract(req, res) {
  const contract = await createContract(req.body, req.user);
  res.status(201).json({ contract });
}

export async function editContract(req, res) {
  const contract = await updateContract(parseId(req.params.id, "Contract ID"), req.body, req.user);
  res.json({ contract });
}

export async function activate(req, res) {
  const contract = await activateContract(parseId(req.params.id, "Contract ID"), req.user);
  res.json({ contract });
}

export async function pause(req, res) {
  const contract = await setContractStatus(parseId(req.params.id, "Contract ID"), "PAUSED", req.user);
  res.json({ contract });
}

export async function cancel(req, res) {
  const contract = await setContractStatus(parseId(req.params.id, "Contract ID"), "CANCELLED", req.user);
  res.json({ contract });
}

export async function complete(req, res) {
  const contract = await setContractStatus(parseId(req.params.id, "Contract ID"), "COMPLETED", req.user);
  res.json({ contract });
}

export async function removeContract(req, res) {
  const contract = await deleteContract(parseId(req.params.id, "Contract ID"), req.user);

  if (contract) {
    res.json({ contract });
    return;
  }

  res.status(204).send();
}

export async function storeContractService(req, res) {
  const service = await addContractService(parseId(req.params.id, "Contract ID"), req.body, req.user);
  res.status(201).json({ service });
}

export async function editContractService(req, res) {
  const service = await updateContractService(
    parseId(req.params.id, "Contract ID"),
    parseId(req.params.serviceId, "Contract service ID"),
    req.body,
    req.user
  );
  res.json({ service });
}

export async function pauseContractService(req, res) {
  const service = await updateContractService(
    parseId(req.params.id, "Contract ID"),
    parseId(req.params.serviceId, "Contract service ID"),
    { status: "PAUSED" },
    req.user
  );
  res.json({ service });
}

export async function resumeContractService(req, res) {
  const service = await updateContractService(
    parseId(req.params.id, "Contract ID"),
    parseId(req.params.serviceId, "Contract service ID"),
    { status: "ACTIVE" },
    req.user
  );
  res.json({ service });
}

export async function storeBillingRule(req, res) {
  const billingRule = await addBillingRule(parseId(req.params.id, "Contract ID"), req.body, req.user);
  res.status(201).json({ billingRule });
}

export async function editBillingRule(req, res) {
  const billingRule = await updateBillingRule(
    parseId(req.params.id, "Contract ID"),
    parseId(req.params.ruleId, "Billing rule ID"),
    req.body,
    req.user
  );
  res.json({ billingRule });
}

export async function listContractInvoices(req, res) {
  const invoices = await getContractInvoices(parseId(req.params.id, "Contract ID"), req.user);
  res.json({ invoices });
}
