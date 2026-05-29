import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.get("/", authenticate, authorize("ADMIN", "AGENT"), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true },
    orderBy: { name: "asc" }
  });

  return res.json({ users });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.json({ user });
}));

export default router;
