import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
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

export async function getCustomers() {
  return prisma.customer.findMany({
    include: {
      systems: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      updatedBy: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
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
        createdById: currentUser?.id,
        updatedById: currentUser?.id,
        systems: systems?.length ? { create: systems } : undefined
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

  if (normalizedCustomerData.email && !validateEmail(normalizedCustomerData.email)) {
    throw new ApiError(400, "A valid customer email is required");
  }

  if (!Number.isFinite(normalizedCustomerData.jobPaymentAmount) || normalizedCustomerData.jobPaymentAmount < 0) {
    throw new ApiError(400, "Job payment amount must be a valid non-negative amount");
  }

  return prisma.$transaction(async (tx) => {
    await tx.customer.findUniqueOrThrow({ where: { id } });

    if (Array.isArray(systems)) {
      await tx.customerSystem.deleteMany({ where: { customerId: id } });
    }

    return tx.customer.update({
      where: { id },
      data: {
        ...normalizedCustomerData,
        updatedById: currentUser?.id,
        systems: Array.isArray(systems) ? { create: systems } : undefined
      },
      include: {
        systems: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });
  });
}

export async function deleteCustomer(id) {
  await prisma.customer.findUniqueOrThrow({ where: { id } });
  await prisma.customer.delete({ where: { id } });
}
