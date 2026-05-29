import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer
} from "../services/customer.service.js";
import { parseId } from "../utils/validation.js";

export async function listCustomers(req, res) {
  const customers = await getCustomers(req.user);
  res.json({ customers });
}

export async function getCustomer(req, res) {
  const customer = await getCustomerById(parseId(req.params.id, "Customer ID"), req.user);
  res.json({ customer });
}

export async function storeCustomer(req, res) {
  const customer = await createCustomer(req.body, req.user);
  res.status(201).json({ customer });
}

export async function editCustomer(req, res) {
  const customer = await updateCustomer(parseId(req.params.id, "Customer ID"), req.body, req.user);
  res.json({ customer });
}

export async function removeCustomer(req, res) {
  await deleteCustomer(parseId(req.params.id, "Customer ID"), req.user);
  res.status(204).send();
}
