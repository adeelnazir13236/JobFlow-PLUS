import { loginUser, registerUser } from "../services/auth.service.js";

export async function register(req, res) {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await loginUser(req.body);
  res.json(result);
}
