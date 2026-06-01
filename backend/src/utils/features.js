import prisma from "../config/prisma.js";
import ApiError from "./ApiError.js";
import { isSystemAdmin } from "./tenant.js";

const deniedMessage = "Feature not available in your current plan.";

export async function hasFeature(user, featureCode) {
  if (isSystemAdmin(user)) {
    return true;
  }

  if (!user?.organizationId || user.organization?.status !== "ACTIVE") {
    return false;
  }

  const now = new Date();
  const subscription = await prisma.organizationSubscription.findFirst({
    where: {
      organizationId: user.organizationId,
      status: { in: ["ACTIVE", "TRIAL"] },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }]
    },
    include: {
      plan: {
        include: {
          features: {
            include: { feature: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!subscription || subscription.plan.status !== "ACTIVE") {
    return false;
  }

  const override = await prisma.organizationFeature.findFirst({
    where: {
      organizationId: user.organizationId,
      feature: { code: featureCode, status: "ACTIVE" }
    },
    include: { feature: true }
  });

  if (override) {
    return override.enabled;
  }

  return subscription.plan.features.some((planFeature) =>
    planFeature.feature.code === featureCode && planFeature.feature.status === "ACTIVE"
  );
}

export function requireFeature(featureCode) {
  return async (req, _res, next) => {
    try {
      const allowed = await hasFeature(req.user, featureCode);

      if (!allowed) {
        return next(new ApiError(403, deniedMessage));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export async function getFeatureCodesForUser(user) {
  if (isSystemAdmin(user)) {
    const features = await prisma.feature.findMany({
      where: { status: "ACTIVE" },
      select: { code: true }
    });
    return features.map((feature) => feature.code);
  }

  if (!user?.organizationId || user.organization?.status !== "ACTIVE") {
    return [];
  }

  const now = new Date();
  const subscription = await prisma.organizationSubscription.findFirst({
    where: {
      organizationId: user.organizationId,
      status: { in: ["ACTIVE", "TRIAL"] },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }]
    },
    include: {
      plan: {
        include: {
          features: { include: { feature: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!subscription || subscription.plan.status !== "ACTIVE") {
    return [];
  }

  const codes = new Set(
    subscription.plan.features
      .filter((planFeature) => planFeature.feature.status === "ACTIVE")
      .map((planFeature) => planFeature.feature.code)
  );

  const overrides = await prisma.organizationFeature.findMany({
    where: { organizationId: user.organizationId },
    include: { feature: true }
  });

  for (const override of overrides) {
    if (override.feature.status !== "ACTIVE") {
      continue;
    }

    if (override.enabled) {
      codes.add(override.feature.code);
    } else {
      codes.delete(override.feature.code);
    }
  }

  return [...codes];
}
