import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantData, tenantWhere } from "../utils/tenant.js";
import { validateEmail } from "../utils/validation.js";

const customerInclude = {
  systems: true,
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  updatedBy: { select: { id: true, name: true, email: true, role: true } },
  jobs: {
    include: {
      assignedStaff: { select: { id: true, name: true, email: true, role: true } },
      payments: { orderBy: { createdAt: "desc" } }
    },
    orderBy: { scheduledDate: "desc" }
  },
  payments: {
    include: { job: true },
    orderBy: { createdAt: "desc" }
  }
};

function normalizeCustomerData(customerData) {
  return {
    ...customerData,
    jobPaymentAmount: customerData.jobPaymentAmount !== undefined && customerData.jobPaymentAmount !== ""
      ? Number(customerData.jobPaymentAmount)
      : 0
  };
}

export async function getCustomers(currentUser) {
  return prisma.customer.findMany({
    where: tenantWhere(currentUser),
    include: {
      systems: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      updatedBy: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getCustomerById(id, currentUser) {
  const customer = await prisma.customer.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: {
      ...customerInclude,
      callLogs: {
        include: { agent: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" }
      },
      followUps: {
        include: { job: true },
        orderBy: { followUpDate: "asc" }
      }
    }
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

export async function createCustomer(data, currentUser) {
  const { systems, ...customerData } = data;
  const normalizedCustomerData = normalizeCustomerData(customerData);
  const tenant = tenantData(currentUser);

  if (!normalizedCustomerData.name || !normalizedCustomerData.phone) {
    throw new ApiError(400, "Customer name and phone are required");
  }

  if (normalizedCustomerData.email && !validateEmail(normalizedCustomerData.email)) {
    throw new ApiError(400, "A valid customer email is required");
  }

  if (!Number.isFinite(normalizedCustomerData.jobPaymentAmount) || normalizedCustomerData.jobPaymentAmount < 0) {
    throw new ApiError(400, "Job payment amount must be a valid non-negative amount");
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        ...normalizedCustomerData,
        ...tenant,
        createdById: currentUser?.id,
        updatedById: currentUser?.id,
        systems: systems?.length ? { create: systems.map((system) => ({ ...system, ...tenant })) } : undefined
      },
      include: {
        systems: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    await tx.followUp.create({
      data: {
        customerId: customer.id,
        ...tenant,
        followUpDate: new Date(),
        status: "PENDING",
        createdById: currentUser?.id,
        updatedById: currentUser?.id,
        notes: "Auto-created for new customer call"
      }
    });

    return customer;
  });
}

export async function updateCustomer(id, data, currentUser) {
  const { systems, ...customerData } = data;
  const normalizedCustomerData = normalizeCustomerData(customerData);
  const tenant = tenantData(currentUser);

  if (normalizedCustomerData.email && !validateEmail(normalizedCustomerData.email)) {
    throw new ApiError(400, "A valid customer email is required");
  }

  if (!Number.isFinite(normalizedCustomerData.jobPaymentAmount) || normalizedCustomerData.jobPaymentAmount < 0) {
    throw new ApiError(400, "Job payment amount must be a valid non-negative amount");
  }

  return prisma.$transaction(async (tx) => {
    const existingCustomer = await tx.customer.findFirst({ where: { id, ...tenantWhere(currentUser) } });

    if (!existingCustomer) {
      throw new ApiError(404, "Customer not found");
    }

    if (Array.isArray(systems)) {
      await tx.customerSystem.deleteMany({ where: { customerId: id, ...tenantWhere(currentUser) } });
    }

    return tx.customer.update({
      where: { id },
      data: {
        ...normalizedCustomerData,
        updatedById: currentUser?.id,
        systems: Array.isArray(systems) ? { create: systems.map((system) => ({ ...system, ...tenant })) } : undefined
      },
      include: {
        systems: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });
  });
}

export async function deleteCustomer(id, currentUser) {
  const customer = await prisma.customer.findFirst({ where: { id, ...tenantWhere(currentUser) } });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  await prisma.customer.delete({ where: { id } });
}
