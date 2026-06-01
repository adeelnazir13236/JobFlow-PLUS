import {
  addQuotationItem,
  convertQuotationToContract,
  convertQuotationToJob,
  createQuotation,
  deleteQuotation,
  deleteQuotationItem,
  getQuotationById,
  getQuotations,
  setQuotationStatus,
  updateQuotation,
  updateQuotationItem
} from "../services/quotation.service.js";
import { generateQuotationPdf } from "../services/quotationPdf.service.js";
import { parseId } from "../utils/validation.js";

function sendPdf(res, filename, buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(buffer);
}

export async function listQuotations(req, res) {
  const quotations = await getQuotations(req.user, req.query);
  res.json({ quotations });
}

export async function getQuotation(req, res) {
  const quotation = await getQuotationById(parseId(req.params.id, "Quotation ID"), req.user);
  res.json({ quotation });
}

export async function downloadQuotationPdf(req, res) {
  const id = parseId(req.params.id, "Quotation ID");
  const buffer = await generateQuotationPdf(id, req.user);
  sendPdf(res, `quotation-${id}.pdf`, buffer);
}

export async function storeQuotation(req, res) {
  const quotation = await createQuotation(req.body, req.user);
  res.status(201).json({ quotation });
}

export async function editQuotation(req, res) {
  const quotation = await updateQuotation(parseId(req.params.id, "Quotation ID"), req.body, req.user);
  res.json({ quotation });
}

export async function changeQuotationStatus(req, res) {
  const quotation = await setQuotationStatus(parseId(req.params.id, "Quotation ID"), req.body.status, req.user);
  res.json({ quotation });
}

export async function removeQuotation(req, res) {
  const quotation = await deleteQuotation(parseId(req.params.id, "Quotation ID"), req.user);

  if (quotation) {
    res.json({ quotation });
    return;
  }

  res.status(204).send();
}

export async function storeQuotationItem(req, res) {
  const quotation = await addQuotationItem(parseId(req.params.id, "Quotation ID"), req.body, req.user);
  res.status(201).json({ quotation });
}

export async function editQuotationItem(req, res) {
  const quotation = await updateQuotationItem(
    parseId(req.params.id, "Quotation ID"),
    parseId(req.params.itemId, "Quotation item ID"),
    req.body,
    req.user
  );
  res.json({ quotation });
}

export async function removeQuotationItem(req, res) {
  const quotation = await deleteQuotationItem(
    parseId(req.params.id, "Quotation ID"),
    parseId(req.params.itemId, "Quotation item ID"),
    req.user
  );
  res.json({ quotation });
}

export async function convertToJob(req, res) {
  const quotation = await convertQuotationToJob(parseId(req.params.id, "Quotation ID"), req.body, req.user);
  res.json({ quotation });
}

export async function convertToContract(req, res) {
  const quotation = await convertQuotationToContract(parseId(req.params.id, "Quotation ID"), req.body, req.user);
  res.json({ quotation });
}
