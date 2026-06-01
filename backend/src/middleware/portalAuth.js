import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { hasFeature } from "../utils/features.js";

export async function authenticatePortal(req, _res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next(new ApiError(401, "Customer portal token is required"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.type !== "CUSTOMER_PORTAL") {
      return next(new ApiError(401, "Invalid customer portal token"));
    }

    const portalUser = await prisma.customerPortalUser.findUnique({
      where: { id: payload.id },
      include: {
        organization: { select: { id: true, name: true, status: true, plan: true } },
        customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true, address: true, area: true, city: true, status: true } }
      }
    });

    if (!portalUser || portalUser.status !== "ACTIVE" || portalUser.organization.status !== "ACTIVE") {
      return next(new ApiError(401, "Customer portal access is not active"));
    }

    const portalAllowed = await hasFeature({
      organizationId: portalUser.organizationId,
      organization: portalUser.organization
    }, "CUSTOMER_PORTAL");

    if (!portalAllowed) {
      return next(new ApiError(403, "Customer portal is not available in your current plan."));
    }

    req.portalUser = portalUser;
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired customer portal token"));
  }
}
