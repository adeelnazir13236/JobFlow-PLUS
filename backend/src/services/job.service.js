import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantData, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";

const jobStatuses = ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"];

const jobInclude = {
  customer: true,
  assignedAgent: { select: { id: true, name: true, email: true, role: true } },
  assignedStaff: { select: { id: true, name: true, email: true, role: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  updatedBy: { select: { id: true, name: true, email: true, role: true } },
  completedBy: { select: { id: true, name: true, email: true, role: true } },
  followUps: true,
  payments: {
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      updatedBy: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  }
};

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function createFollowUpIfMissing(tx, job, currentUser) {
  const existingFollowUp = await tx.followUp.findFirst({
    where: { jobId: job.id }
  });

  if (existingFollowUp || !job.completionDate) {
    return;
  }

  await tx.followUp.create({
    data: {
      customerId: job.customerId,
      organizationId: job.organizationId,
      jobId: job.id,
      followUpDate: addDays(job.completionDate, 15),
      status: "PENDING",
      createdById: currentUser?.id,
      updatedById: currentUser?.id,
      notes: "Auto-created after job completion"
    }
  });
}

async function createPaymentIfMissing(tx, job, currentUser) {
  const existingPayment = await tx.payment.findFirst({
    where: { jobId: job.id }
  });

  if (existingPayment) {
    return;
  }

  const customer = await tx.customer.findUnique({
    where: { id: job.customerId },
    select: { jobPaymentAmount: true }
  });
  const totalAmount = Number(customer?.jobPaymentAmount || 0);

  if (totalAmount <= 0) {
    return;
  }

  const payment = await tx.payment.create({
    data: {
      invoiceNumber: `TMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      organizationId: job.organizationId,
      customerId: job.customerId,
      jobId: job.id,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      paymentDate: new Date(),
      createdById: currentUser?.id,
      updatedById: currentUser?.id,
      remarks: "Auto-created after job completion"
    }
  });

  await tx.payment.update({
    where: { id: payment.id },
    data: { invoiceNumber: `INV-${String(payment.id).padStart(6, "0")}` }
  });
}

async function validateTenantReferences(tx, data, currentUser, existingJob) {
  const where = tenantWhere(currentUser);
  const customerId = data.customerId ? Number(data.customerId) : existingJob?.customerId;

  if (customerId) {
    const customer = await tx.customer.findFirst({ where: { id: customerId, ...where } });
    if (!customer) {
      throw new ApiError(404, "Customer not found");
    }
  }

  for (const userId of [data.assignedAgentId, data.assignedStaffId]) {
    if (userId) {
      const user = await tx.user.findFirst({ where: { id: Number(userId), ...where } });
      if (!user) {
        throw new ApiError(400, "Assigned user must belong to the same organization");
      }
    }
  }
}

export async function getJobs(currentUser) {
  return prisma.job.findMany({
    where: tenantWhere(currentUser),
    include: jobInclude,
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }]
  });
}

export async function getJobById(id, currentUser) {
  const job = await prisma.job.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: jobInclude
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  return job;
}

export async function getCalendarJobs(currentUser) {
  const jobs = await prisma.job.findMany({
    where: tenantWhere(currentUser),
    include: {
      customer: { select: { id: true, name: true, phone: true, area: true, city: true } },
      assignedAgent: { select: { id: true, name: true, email: true, role: true } },
      assignedStaff: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }]
  });

  return jobs.map((job) => ({
    id: job.id,
    title: `${job.customer.name} - ${job.status}`,
    date: job.scheduledDate,
    scheduledTime: job.scheduledTime,
    status: job.status,
    customer: job.customer,
    assignedAgent: job.assignedAgent,
    assignedStaff: job.assignedStaff
  }));
}

export async function createJob(data, currentUser) {
  const { customerId, scheduledDate, scheduledTime } = data;

  if (!customerId || !scheduledDate || !scheduledTime) {
    throw new ApiError(400, "Customer, scheduled date, and scheduled time are required");
  }

  validateEnum(data.status, jobStatuses, "Job status");

  return prisma.$transaction(async (tx) => {
    await validateTenantReferences(tx, data, currentUser);

    return tx.job.create({
      data: {
        ...tenantData(currentUser),
        customerId: Number(customerId),
        assignedAgentId: data.assignedAgentId ? Number(data.assignedAgentId) : undefined,
        assignedStaffId: data.assignedStaffId ? Number(data.assignedStaffId) : undefined,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        status: data.status || "SCHEDULED",
        completionDate: data.completionDate ? new Date(data.completionDate) : undefined,
        createdById: currentUser?.id,
        updatedById: currentUser?.id,
        completedById: data.status === "COMPLETED" ? currentUser?.id : undefined,
        remarks: data.remarks
      },
      include: jobInclude
    });
  });
}

export async function updateJob(id, data, currentUser) {
  validateEnum(data.status, jobStatuses, "Job status");

  return prisma.$transaction(async (tx) => {
    const existingJob = await tx.job.findFirst({ where: { id, ...tenantWhere(currentUser) } });

    if (!existingJob) {
      throw new ApiError(404, "Job not found");
    }

    await validateTenantReferences(tx, data, currentUser, existingJob);
    const isCompleting = data.status === "COMPLETED" && existingJob.status !== "COMPLETED";

    const job = await tx.job.update({
      where: { id },
      data: {
        customerId: data.customerId ? Number(data.customerId) : undefined,
        assignedAgentId: data.assignedAgentId === null ? null : data.assignedAgentId ? Number(data.assignedAgentId) : undefined,
        assignedStaffId: data.assignedStaffId === null ? null : data.assignedStaffId ? Number(data.assignedStaffId) : undefined,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        scheduledTime: data.scheduledTime,
        status: data.status,
        updatedById: currentUser?.id,
        completedById: isCompleting ? currentUser?.id : undefined,
        completionDate: data.completionDate
          ? new Date(data.completionDate)
          : isCompleting
            ? new Date()
            : data.completionDate === null
              ? null
              : undefined,
        remarks: data.remarks
      }
    });

    if (job.status === "COMPLETED") {
      await createFollowUpIfMissing(tx, job, currentUser);
      await createPaymentIfMissing(tx, job, currentUser);
    }

    return tx.job.findUnique({
      where: { id },
      include: jobInclude
    });
  });
}

export async function completeJob(id, remarks, currentUser) {
  return prisma.$transaction(async (tx) => {
    const existingJob = await tx.job.findFirst({ where: { id, ...tenantWhere(currentUser) } });

    if (!existingJob) {
      throw new ApiError(404, "Job not found");
    }

    const job = await tx.job.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completionDate: existingJob.completionDate || new Date(),
        updatedById: currentUser?.id,
        completedById: currentUser?.id,
        remarks: remarks ?? existingJob.remarks
      }
    });

    await createFollowUpIfMissing(tx, job, currentUser);
    await createPaymentIfMissing(tx, job, currentUser);

    return tx.job.findUnique({
      where: { id },
      include: jobInclude
    });
  });
}
