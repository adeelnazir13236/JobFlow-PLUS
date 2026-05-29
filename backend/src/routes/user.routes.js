import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isSystemAdmin, tenantWhere, userSelectWithOrganization } from "../utils/tenant.js";

const router = Router();

router.post("/organization-admins", authenticate, authorize("SYSTEM_ADMIN"), asyncHandler(async (req, res) => {
  const { organizationId, name, email, password } = req.body;

  if (!organizationId || !name || !email || !password) {
    throw new ApiError(400, "Organization, name, email, and password are required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: Number(organizationId) }
  });

  if (!organization || organization.status !== "ACTIVE") {
    throw new ApiError(400, "A valid active organization is required");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE"
    },
    select: userSelectWithOrganization()
  });

  return res.status(201).json({ user });
}));

router.get("/", authenticate, authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: isSystemAdmin(req.user) ? {} : tenantWhere(req.user),
    select: userSelectWithOrganization(),
    orderBy: { name: "asc" }
  });

  return res.json({ users });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { ...userSelectWithOrganization(), createdAt: true }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.json({ user });
}));

export default router;
