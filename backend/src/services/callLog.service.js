import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantData, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";

const callResponses = ["INTERESTED", "NOT_INTERESTED", "CALL_LATER", "WRONG_NUMBER", "NO_ANSWER"];
const callLogInclude = {
  customer: true,
  agent: { select: { id: true, name: true, email: true, role: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  updatedBy: { select: { id: true, name: true, email: true, role: true } }
};

export async function getCallLogs(filters = {}, currentUser) {
  const where = {
    ...tenantWhere(currentUser),
    customerId: filters.customerId ? Number(filters.customerId) : undefined,
    agentId: filters.agentId ? Number(filters.agentId) : undefined,
    response: filters.response || undefined
  };

  validateEnum(where.response, callResponses, "Call response");

  return prisma.callLog.findMany({
    where,
    include: callLogInclude,
    orderBy: { createdAt: "desc" }
  });
}

export async function getCallLogById(id, currentUser) {
  const callLog = await prisma.callLog.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: callLogInclude
  });

  if (!callLog) {
    throw new ApiError(404, "Call log not found");
  }

  return callLog;
}

export async function createCallLog(data, currentUser) {
  const { customerId, response } = data;

  if (!customerId || !response) {
    throw new ApiError(400, "Customer and response are required");
  }

  validateEnum(response, callResponses, "Call response");

  const customer = await prisma.customer.findFirst({
    where: { id: Number(customerId), ...tenantWhere(currentUser) }
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return prisma.callLog.create({
    data: {
      ...tenantData(currentUser),
      customerId: Number(customerId),
      agentId: data.agentId ? Number(data.agentId) : currentUser.id,
      response,
      notes: data.notes,
      createdById: currentUser?.id,
      updatedById: currentUser?.id,
      nextCallDate: data.nextCallDate ? new Date(data.nextCallDate) : undefined
    },
    include: callLogInclude
  });
}

export async function updateCallLog(id, data, currentUser) {
  validateEnum(data.response, callResponses, "Call response");

  const existingCallLog = await prisma.callLog.findFirst({ where: { id, ...tenantWhere(currentUser) } });

  if (!existingCallLog) {
    throw new ApiError(404, "Call log not found");
  }

  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: Number(data.customerId), ...tenantWhere(currentUser) }
    });

    if (!customer) {
      throw new ApiError(404, "Customer not found");
    }
  }

  return prisma.callLog.update({
    where: { id },
    data: {
      customerId: data.customerId ? Number(data.customerId) : undefined,
      agentId: data.agentId === null ? null : data.agentId ? Number(data.agentId) : undefined,
      response: data.response,
      notes: data.notes,
      updatedById: currentUser?.id,
      nextCallDate: data.nextCallDate ? new Date(data.nextCallDate) : data.nextCallDate === null ? null : undefined
    },
    include: callLogInclude
  });
}

export async function getCustomerCallLogs(customerId, currentUser) {
  return prisma.callLog.findMany({
    where: { customerId, ...tenantWhere(currentUser) },
    include: callLogInclude,
    orderBy: { createdAt: "desc" }
  });
}
