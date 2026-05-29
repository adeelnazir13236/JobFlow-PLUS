import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantData, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";

export const paymentStatuses = ["PENDING", "PARTIAL_PAID", "PAID", "CANCELLED", "REFUNDED"];
export const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "JAZZCASH", "EASYPAISA", "OTHER"];

const paymentInclude = {
  customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true, address: true, area: true, city: true } },
  job: {
    select: {
      id: true,
      customerId: true,
      scheduledDate: true,
      scheduledTime: true,
      status: true,
      completionDate: true
    }
  },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  updatedBy: { select: { id: true, name: true, email: true, role: true } }
};

function invoiceNumberForId(id) {
  return `INV-${String(id).padStart(6, "0")}`;
}

function temporaryInvoiceNumber() {
  return `TMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toAmount(value, field) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, `${field} must be a valid non-negative amount`);
  }

  return amount;
}

function normalizePaidAmount(totalAmount, paidAmount, explicitStatus) {
  if (explicitStatus === "PAID") {
    return totalAmount;
  }

  if (explicitStatus === "PENDING") {
    return 0;
  }

  return paidAmount;
}

function calculateStatus(totalAmount, paidAmount, explicitStatus) {
  if (explicitStatus === "CANCELLED" || explicitStatus === "REFUNDED") {
    return explicitStatus;
  }

  if (paidAmount <= 0) {
    return explicitStatus || "PENDING";
  }

  if (paidAmount >= totalAmount) {
    return "PAID";
  }

  return "PARTIAL_PAID";
}

async function buildPaymentData(data, existingPayment, currentUser) {
  validateEnum(data.paymentStatus, paymentStatuses, "Payment status");
  validateEnum(data.paymentMethod, paymentMethods, "Payment method");

  const customerId = data.customerId ? Number(data.customerId) : existingPayment?.customerId;
  const jobId = data.jobId ? Number(data.jobId) : existingPayment?.jobId;

  if (!customerId || !jobId) {
    throw new ApiError(400, "Customer and job are required");
  }

  const job = await prisma.job.findFirst({ where: { id: jobId, ...tenantWhere(currentUser) } });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  if (job.customerId !== customerId) {
    throw new ApiError(400, "Selected job does not belong to the selected customer");
  }

  if (job.status !== "COMPLETED") {
    throw new ApiError(400, "Payments can only be created or updated for completed jobs");
  }

  const totalAmount = data.totalAmount !== undefined
    ? toAmount(data.totalAmount, "Total amount")
    : Number(existingPayment?.totalAmount);
  const rawPaidAmount = data.paidAmount !== undefined
    ? toAmount(data.paidAmount, "Paid amount")
    : Number(existingPayment?.paidAmount || 0);
  const paidAmount = normalizePaidAmount(totalAmount, rawPaidAmount, data.paymentStatus);
  const balanceAmount = Math.max(totalAmount - paidAmount, 0);
  const paymentStatus = calculateStatus(totalAmount, paidAmount, data.paymentStatus || existingPayment?.paymentStatus);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new ApiError(400, "Total amount must be greater than zero");
  }

  return {
    customerId,
    jobId,
    totalAmount,
    paidAmount,
    balanceAmount,
    paymentMethod: data.paymentMethod || existingPayment?.paymentMethod || "CASH",
    paymentStatus,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : data.paymentDate === null ? null : existingPayment ? undefined : new Date(),
    remarks: data.remarks
  };
}

export async function getPayments(currentUser) {
  return prisma.payment.findMany({
    where: tenantWhere(currentUser),
    include: paymentInclude,
    orderBy: { createdAt: "desc" }
  });
}

export async function getPaymentById(id, currentUser) {
  const payment = await prisma.payment.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: paymentInclude
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  return payment;
}

export async function createPayment(data, currentUser) {
  const paymentData = await buildPaymentData(data, undefined, currentUser);
  const existingPayment = await prisma.payment.findUnique({
    where: { jobId: paymentData.jobId }
  });

  if (existingPayment) {
    throw new ApiError(409, "A payment or invoice already exists for this job");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        ...paymentData,
        ...tenantData(currentUser),
        invoiceNumber: temporaryInvoiceNumber(),
        createdById: currentUser?.id,
        updatedById: currentUser?.id
      }
    });

    return tx.payment.update({
      where: { id: payment.id },
      data: { invoiceNumber: invoiceNumberForId(payment.id) },
      include: paymentInclude
    });
  });
}

export async function updatePayment(id, data, currentUser) {
  const existingPayment = await prisma.payment.findFirst({ where: { id, ...tenantWhere(currentUser) } });

  if (!existingPayment) {
    throw new ApiError(404, "Payment not found");
  }

  const paymentData = await buildPaymentData(data, existingPayment, currentUser);

  return prisma.payment.update({
    where: { id },
    data: {
      ...paymentData,
      updatedById: currentUser?.id
    },
    include: paymentInclude
  });
}

export async function deletePayment(id, currentUser) {
  await getPaymentById(id, currentUser);
  await prisma.payment.delete({ where: { id } });
}
