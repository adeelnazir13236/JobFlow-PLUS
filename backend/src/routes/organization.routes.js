import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseId, validateEnum, validateOptionalEmail } from "../utils/validation.js";

const router = Router();
const organizationStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const organizationPlans = ["FREE", "PLUS", "PRO", "ENTERPRISE"];

router.use(authenticate, authorize("SYSTEM_ADMIN"));

function validateOrganizationPayload(data, { partial = false } = {}) {
  if (!partial || data.name !== undefined) {
    if (!data.name?.trim()) {
      throw new ApiError(400, "Organization name is required");
    }
  }

  validateOptionalEmail(data.email, "Organization email");
  validateEnum(data.status, organizationStatuses, "Organization status");
  validateEnum(data.plan, organizationPlans, "Organization plan");

  if (!partial && !data.plan) {
    throw new ApiError(400, "Organization plan is required");
  }
}

async function ensureUniqueOrganizationEmail(email, organizationId) {
  if (!email) {
    return;
  }

  const existingOrganization = await prisma.organization.findFirst({
    where: {
      email,
      id: organizationId ? { not: organizationId } : undefined
    }
  });

  if (existingOrganization) {
    throw new ApiError(409, "Organization email is already in use");
  }
}

function organizationData(data) {
  return {
    name: data.name?.trim(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    address: data.address?.trim() || null,
    status: data.status || "ACTIVE",
    plan: data.plan || "FREE"
  };
}

router.get("/", asyncHandler(async (req, res) => {
  const { search, status, plan } = req.query;

  validateEnum(status, organizationStatuses, "Organization status");
  validateEnum(plan, organizationPlans, "Organization plan");

  const where = {
    status: status || undefined,
    plan: plan || undefined,
    OR: search
      ? [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { address: { contains: search } }
        ]
      : undefined
  };

  const organizations = await prisma.organization.findMany({
    where,
    include: {
      _count: {
        select: {
          users: true,
          customers: true,
          jobs: true,
          followUps: true,
          callLogs: true,
          payments: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ organizations });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "Organization ID");
  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
        orderBy: { name: "asc" }
      },
      customers: {
        take: 8,
        select: { id: true, name: true, phone: true, city: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" }
      },
      jobs: {
        take: 8,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          assignedStaff: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      callLogs: {
        take: 8,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      },
      subscriptions: {
        take: 1,
        include: { plan: true },
        orderBy: { createdAt: "desc" }
      },
      featureOverrides: {
        include: { feature: true },
        orderBy: { createdAt: "desc" }
      },
      _count: {
        select: {
          users: true,
          customers: true,
          jobs: true,
          followUps: true,
          callLogs: true,
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
  validateOrganizationPayload(req.body);
  await ensureUniqueOrganizationEmail(req.body.email);

  const organization = await prisma.organization.create({
    data: organizationData(req.body)
  });

  res.status(201).json({ organization });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "Organization ID");
  validateOrganizationPayload(req.body, { partial: true });
  await ensureUniqueOrganizationEmail(req.body.email, id);

  const existingOrganization = await prisma.organization.findUnique({ where: { id } });

  if (!existingOrganization) {
    throw new ApiError(404, "Organization not found");
  }

  const organization = await prisma.organization.update({
    where: { id },
    data: organizationData({ ...existingOrganization, ...req.body })
  });

  res.json({ organization });
}));

router.patch("/:id/status", asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, "Organization ID");
  validateEnum(req.body.status, organizationStatuses, "Organization status");

  if (!req.body.status) {
    throw new ApiError(400, "Organization status is required");
  }

  const organization = await prisma.organization.update({
    where: { id },
    data: { status: req.body.status }
  });

  res.json({ organization });
}));

router.put("/:id/subscription", asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.id, "Organization ID");
  const planId = parseId(req.body.planId, "Plan ID");
  validateEnum(req.body.status, ["ACTIVE", "INACTIVE", "CANCELLED", "EXPIRED"], "Subscription status");
  validateEnum(req.body.billingCycle, ["MONTHLY", "YEARLY"], "Billing cycle");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.status !== "ACTIVE") {
    throw new ApiError(400, "A valid active plan is required");
  }

  await prisma.organizationSubscription.updateMany({
    where: { organizationId, status: "ACTIVE" },
    data: { status: "INACTIVE" }
  });

  const subscription = await prisma.organizationSubscription.create({
    data: {
      organizationId,
      planId,
      status: req.body.status || "ACTIVE",
      billingCycle: req.body.billingCycle || "MONTHLY",
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null
    },
    include: { plan: true }
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: plan.code }
  });

  res.json({ subscription });
}));

router.put("/:id/features", asyncHandler(async (req, res) => {
  const organizationId = parseId(req.params.id, "Organization ID");
  const overrides = Array.isArray(req.body.overrides) ? req.body.overrides : [];

  await prisma.$transaction(async (tx) => {
    for (const override of overrides) {
      await tx.organizationFeature.upsert({
        where: { organizationId_featureId: { organizationId, featureId: Number(override.featureId) } },
        update: { enabled: Boolean(override.enabled), source: override.source || "MANUAL" },
        create: {
          organizationId,
          featureId: Number(override.featureId),
          enabled: Boolean(override.enabled),
          source: override.source || "MANUAL"
        }
      });
    }
  });

  const featureOverrides = await prisma.organizationFeature.findMany({
    where: { organizationId },
    include: { feature: true }
  });

  res.json({ featureOverrides });
}));

export default router;
