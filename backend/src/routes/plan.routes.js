import { Router } from "express";
import prisma from "../config/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseId, validateEnum } from "../utils/validation.js";

const router = Router();
const statuses = ["ACTIVE", "INACTIVE"];

router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.get("/features", asyncHandler(async (_req, res) => {
  const features = await prisma.feature.findMany({ orderBy: [{ moduleGroup: "asc" }, { name: "asc" }] });
  res.json({ features });
}));

router.post("/features", asyncHandler(async (req, res) => {
  const { code, name, description, moduleGroup, status = "ACTIVE" } = req.body;
  if (!code || !name || !moduleGroup) throw new ApiError(400, "Feature code, name, and module group are required");
  validateEnum(status, statuses, "Feature status");
  const feature = await prisma.feature.create({ data: { code, name, description, moduleGroup, status } });
  res.status(201).json({ feature });
}));

router.put("/features/:id", asyncHandler(async (req, res) => {
  validateEnum(req.body.status, statuses, "Feature status");
  const feature = await prisma.feature.update({
    where: { id: parseId(req.params.id, "Feature ID") },
    data: {
      code: req.body.code,
      name: req.body.name,
      description: req.body.description,
      moduleGroup: req.body.moduleGroup,
      status: req.body.status
    }
  });
  res.json({ feature });
}));

router.get("/", asyncHandler(async (_req, res) => {
  const plans = await prisma.plan.findMany({
    include: { features: { include: { feature: true } }, _count: { select: { subscriptions: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json({ plans });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const plan = await prisma.plan.findUnique({
    where: { id: parseId(req.params.id, "Plan ID") },
    include: { features: { include: { feature: true } }, subscriptions: { include: { organization: true } } }
  });
  if (!plan) throw new ApiError(404, "Plan not found");
  res.json({ plan });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, code, description, monthlyPrice = 0, yearlyPrice = 0, status = "ACTIVE" } = req.body;
  if (!name || !code) throw new ApiError(400, "Plan name and code are required");
  validateEnum(status, statuses, "Plan status");
  const plan = await prisma.plan.create({ data: { name, code, description, monthlyPrice, yearlyPrice, status } });
  res.status(201).json({ plan });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  validateEnum(req.body.status, statuses, "Plan status");
  const plan = await prisma.plan.update({
    where: { id: parseId(req.params.id, "Plan ID") },
    data: {
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      monthlyPrice: req.body.monthlyPrice,
      yearlyPrice: req.body.yearlyPrice,
      status: req.body.status
    }
  });
  res.json({ plan });
}));

router.put("/:id/features", asyncHandler(async (req, res) => {
  const planId = parseId(req.params.id, "Plan ID");
  const featureIds = Array.isArray(req.body.featureIds) ? req.body.featureIds.map(Number) : [];
  await prisma.$transaction(async (tx) => {
    await tx.planFeature.deleteMany({ where: { planId } });
    if (featureIds.length) {
      await tx.planFeature.createMany({
        data: featureIds.map((featureId) => ({ planId, featureId })),
        skipDuplicates: true
      });
    }
  });
  const plan = await prisma.plan.findUnique({ where: { id: planId }, include: { features: { include: { feature: true } } } });
  res.json({ plan });
}));

export default router;
