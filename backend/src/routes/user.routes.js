import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { isSystemAdmin, tenantWhere, userSelectWithOrganization } from "../utils/tenant.js";

const router = Router();

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
