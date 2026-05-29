import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isSystemAdmin, tenantWhere, userSelectWithOrganization } from "../utils/tenant.js";
import { parseId, validateEmail, validateEnum } from "../utils/validation.js";

const router = Router();
const userRoles = ["ADMIN", "AGENT", "STAFF"];
const userStatuses = ["ACTIVE", "INACTIVE"];

async function validateOrganization(organizationId) {
  const id = Number(organizationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Organization is required");
  }

  const organization = await prisma.organization.findUnique({ where: { id } });

  if (!organization || organization.status !== "ACTIVE") {
    throw new ApiError(400, "A valid active organization is required");
  }

  return organization;
}

function validateUserPayload(data, { partial = false, requirePassword = false } = {}) {
  if ((!partial || data.name !== undefined) && !data.name?.trim()) {
    throw new ApiError(400, "User name is required");
  }

  if ((!partial || data.email !== undefined) && !validateEmail(data.email || "")) {
    throw new ApiError(400, "A valid email address is required");
  }

  validateEnum(data.role, userRoles, "Role");
  validateEnum(data.status, userStatuses, "User status");

  if ((requirePassword || data.password !== undefined) && (!data.password || data.password.length < 6)) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
}

async function ensureUniqueUserEmail(email, userId) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser.id !== userId) {
    throw new ApiError(409, "Email is already registered");
  }
}

async function createOrganizationUser(data, forcedRole) {
  validateUserPayload({ ...data, role: forcedRole || data.role }, { requirePassword: true });
  const organization = await validateOrganization(data.organizationId);
  await ensureUniqueUserEmail(data.email);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      organizationId: organization.id,
      name: data.name.trim(),
      email: data.email.trim(),
      password: hashedPassword,
      role: forcedRole || data.role || "STAFF",
      status: data.status || "ACTIVE"
    },
    select: userSelectWithOrganization()
  });
}

router.post("/organization-admins", authenticate, authorize("SYSTEM_ADMIN"), asyncHandler(async (req, res) => {
  const user = await createOrganizationUser(req.body, "ADMIN");
  return res.status(201).json({ user });
}));

router.post("/", authenticate, authorize("SYSTEM_ADMIN"), asyncHandler(async (req, res) => {
  const user = await createOrganizationUser(req.body);
  return res.status(201).json({ user });
}));

router.get("/", authenticate, authorize("SYSTEM_ADMIN", "ADMIN", "AGENT"), asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId ? parseId(req.query.organizationId, "Organization ID") : undefined;

  if (!isSystemAdmin(req.user) && organizationId && organizationId !== req.user.organizationId) {
    throw new ApiError(403, "You do not have permission to view users from this organization");
  }

  const users = await prisma.user.findMany({
    where: isSystemAdmin(req.user) ? { organizationId } : tenantWhere(req.user),
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

router.put("/:id", authenticate, authorize("SYSTEM_ADMIN"), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "User ID");
  validateUserPayload(req.body, { partial: true });

  const existingUser = await prisma.user.findUnique({ where: { id } });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  if (existingUser.role === "SYSTEM_ADMIN") {
    throw new ApiError(400, "System Admin users cannot be reassigned from this screen");
  }

  if (req.body.email) {
    await ensureUniqueUserEmail(req.body.email, id);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: req.body.name?.trim(),
      email: req.body.email?.trim(),
      role: req.body.role,
      status: req.body.status
    },
    select: userSelectWithOrganization()
  });

  res.json({ user });
}));

router.patch("/:id/password", authenticate, authorize("SYSTEM_ADMIN"), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "User ID");

  if (!req.body.password || req.body.password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existingUser = await prisma.user.findUnique({ where: { id } });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const password = await bcrypt.hash(req.body.password, 10);
  await prisma.user.update({ where: { id }, data: { password } });

  res.json({ message: "Password updated" });
}));

export default router;
