import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseId } from "../utils/validation.js";

const router = Router();

router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.get("/", asyncHandler(async (_req, res) => {
  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          users: true,
          customers: true,
          jobs: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ organizations });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: parseId(req.params.id, "Organization ID") },
    include: {
      _count: {
        select: {
          users: true,
          customers: true,
          jobs: true,
          payments: true
        }
      }
    }
  });

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  res.json({ organization });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, email, phone, address, status = "ACTIVE", plan = "FREE" } = req.body;

  if (!name) {
    throw new ApiError(400, "Organization name is required");
  }

  const organization = await prisma.organization.create({
    data: { name, email, phone, address, status, plan }
  });

  res.status(201).json({ organization });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const organization = await prisma.organization.update({
    where: { id: parseId(req.params.id, "Organization ID") },
    data: {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      status: req.body.status,
      plan: req.body.plan
    }
  });

  res.json({ organization });
}));

export default router;
