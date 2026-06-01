import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantWhere } from "../utils/tenant.js";

const statuses = ["OPEN", "IN_REVIEW", "CONVERTED_TO_JOB", "CLOSED", "CANCELLED"];

function validateStatus(status) {
  if (status !== undefined && !statuses.includes(status)) {
    throw new ApiError(400, "Service request status is invalid");
  }
}

const include = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  portalUser: { select: { id: true, name: true, email: true, phone: true } },
  relatedContract: { select: { id: true, contractNumber: true, title: true } },
  relatedJob: { select: { id: true, scheduledDate: true, scheduledTime: true, status: true } }
};

export async function getServiceRequests(currentUser, filters = {}) {
  validateStatus(filters.status);
  return prisma.serviceRequest.findMany({
    where: {
      ...tenantWhere(currentUser),
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      requestType: filters.requestType || undefined,
      customerId: filters.customerId ? Number(filters.customerId) : undefined
    },
    include,
    orderBy: { createdAt: "desc" }
  });
}

export async function getServiceRequestById(id, currentUser) {
  const request = await prisma.serviceRequest.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include
  });

  if (!request) {
    throw new ApiError(404, "Service request not found");
  }

  return request;
}

export async function updateServiceRequestStatus(id, status, currentUser) {
  validateStatus(status);
  await getServiceRequestById(id, currentUser);
  return prisma.serviceRequest.update({
    where: { id },
    data: { status },
    include
  });
}

export async function convertServiceRequestToJob(id, data, currentUser) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findFirst({ where: { id, ...tenantWhere(currentUser) } });
    if (!request) {
      throw new ApiError(404, "Service request not found");
    }

    if (request.status === "CONVERTED_TO_JOB" && request.relatedJobId) {
      throw new ApiError(409, "Service request is already converted to a job");
    }

    const scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : new Date();
    const job = await tx.job.create({
      data: {
        organizationId: request.organizationId,
        customerId: request.customerId,
        scheduledDate,
        scheduledTime: data.scheduledTime || "09:00",
        status: "SCHEDULED",
        assignedAgentId: data.assignedAgentId ? Number(data.assignedAgentId) : undefined,
        assignedStaffId: data.assignedStaffId ? Number(data.assignedStaffId) : undefined,
        createdById: currentUser?.id,
        updatedById: currentUser?.id,
        remarks: `Service request ${request.requestNumber}: ${request.title}\n\n${request.description}`
      }
    });

    return tx.serviceRequest.update({
      where: { id },
      data: { status: "CONVERTED_TO_JOB", relatedJobId: job.id },
      include
    });
  });
}
