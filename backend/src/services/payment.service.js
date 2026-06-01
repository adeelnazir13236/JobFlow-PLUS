import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantData, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";
import { safelySendNotification, sendPaymentNotification } from "./whatsapp.service.js";

export const paymentStatuses = ["PENDING", "PARTIAL_PAID", "PARTIALLY_PAID", "PAID", "CANCELLED", "REFUNDED"];
export const paymentMethods = ["CASH", "BANK_TRANSFER", "CHEQUE", "CARD", "ONLINE", "JAZZCASH", "EASYPAISA", "OTHER"];

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
  invoice: { select: { id: true, invoiceNumber: true, amount: true, paidAmount: true, balanceAmount: true, status: true, paymentStatus: true } },
  contract: { select: { id: true, contractNumber: true, title: true } },
  receivedBy: { select: { id: true, name: true, email: true, role: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  updatedBy: { select: { id: true, name: true, email: true, role: true } }
};

function invoiceNumberForId(id) {
  return `INV-${String(id).padStart(6, "0")}`;
}

function paymentNumberForId(id) {
  return `PAY-${String(id).padStart(6, "0")}`;
}

function temporaryPaymentNumber() {
  return `TMP-PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toAmount(value, field, min = 0) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < min) {
    throw new ApiError(400, `${field} must be ${min > 0 ? "greater than zero" : "a valid non-negative amount"}`);
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

function calculateLegacyStatus(totalAmount, paidAmount, explicitStatus) {
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

function invoiceStatusForAmounts(totalAmount, paidAmount, currentStatus = "GENERATED") {
  const balanceAmount = Math.max(totalAmount - paidAmount, 0);

  if (currentStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (paidAmount <= 0) {
    return currentStatus === "SENT" ? "SENT" : "GENERATED";
  }

  if (balanceAmount <= 0) {
    return "PAID";
  }

  return "PARTIALLY_PAID";
}

async function recalculateInvoicePaymentTotals(tx, invoiceId) {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const paid = await tx.payment.aggregate({
    where: {
      invoiceId,
      paymentStatus: { not: "CANCELLED" }
    },
    _sum: { amount: true }
  });

  const totalAmount = Number(invoice.amount || 0);
  const paidAmount = Number(paid._sum.amount || 0);

  if (paidAmount > totalAmount) {
    throw new ApiError(400, "Invoice payments cannot exceed invoice amount");
  }

  const balanceAmount = Math.max(totalAmount - paidAmount, 0);
  const status = invoiceStatusForAmounts(totalAmount, paidAmount, invoice.status);

  return tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount,
      balanceAmount,
      status,
      paymentStatus: status
    }
  });
}

async function buildLegacyPaymentData(data, existingPayment, currentUser) {
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
  const paymentStatus = calculateLegacyStatus(totalAmount, paidAmount, data.paymentStatus || existingPayment?.paymentStatus);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new ApiError(400, "Total amount must be greater than zero");
  }

  return {
    customerId,
    jobId,
    invoiceId: null,
    contractId: null,
    totalAmount,
    amount: paidAmount,
    paidAmount,
    balanceAmount,
    paymentMethod: data.paymentMethod || existingPayment?.paymentMethod || "CASH",
    paymentStatus,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : data.paymentDate === null ? null : existingPayment ? undefined : new Date(),
    remarks: data.remarks,
    notes: data.notes,
    referenceNumber: data.referenceNumber
  };
}

async function buildInvoicePaymentData(data, existingPayment, currentUser, client = prisma) {
  validateEnum(data.paymentMethod, paymentMethods, "Payment method");

  const invoiceId = data.invoiceId ? Number(data.invoiceId) : existingPayment?.invoiceId;

  if (!invoiceId) {
    throw new ApiError(400, "Invoice is required");
  }

  const invoice = await client.invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(currentUser) },
    include: { contract: true }
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  if (invoice.status === "CANCELLED" || invoice.paymentStatus === "CANCELLED") {
    throw new ApiError(400, "Cannot record payment against a cancelled invoice");
  }

  if (!existingPayment && (invoice.status === "PAID" || Number(invoice.balanceAmount) <= 0)) {
    throw new ApiError(400, "Cannot record payment against an already paid invoice");
  }

  const amount = toAmount(data.amount, "Payment amount", 1);
  const previousAmount = existingPayment?.invoiceId === invoice.id ? Number(existingPayment.amount || 0) : 0;
  const invoiceBalance = invoice.balanceAmount === null || invoice.balanceAmount === undefined
    ? Number(invoice.amount || 0)
    : Number(invoice.balanceAmount);
  const remainingBalance = invoiceBalance + previousAmount;

  if (amount > remainingBalance) {
    throw new ApiError(400, "Payment amount cannot exceed invoice balance");
  }

  return {
    organizationId: invoice.organizationId,
    customerId: invoice.customerId,
    jobId: null,
    invoiceId: invoice.id,
    contractId: invoice.contractId,
    totalAmount: invoice.amount,
    amount,
    paidAmount: amount,
    balanceAmount: Math.max(remainingBalance - amount, 0),
    paymentMethod: data.paymentMethod || existingPayment?.paymentMethod || "CASH",
    paymentStatus: amount >= remainingBalance ? "PAID" : "PARTIALLY_PAID",
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : existingPayment ? undefined : new Date(),
    referenceNumber: data.referenceNumber || null,
    notes: data.notes || null,
    remarks: data.notes || data.remarks || null,
    receivedById: currentUser?.id
  };
}

export async function getPayments(currentUser, filters = {}) {
  return prisma.payment.findMany({
    where: {
      ...tenantWhere(currentUser),
      ...(filters.invoiceId ? { invoiceId: Number(filters.invoiceId) } : {}),
      ...(filters.contractId ? { contractId: Number(filters.contractId) } : {}),
      ...(filters.customerId ? { customerId: Number(filters.customerId) } : {}),
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            paymentDate: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {})
            }
          }
        : {})
    },
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
  if (data.invoiceId) {
    const result = await prisma.$transaction(async (tx) => {
      const paymentData = await buildInvoicePaymentData(data, undefined, currentUser, tx);
      const payment = await tx.payment.create({
        data: {
          ...paymentData,
          paymentNumber: temporaryPaymentNumber(),
          invoiceNumber: temporaryPaymentNumber(),
          createdById: currentUser?.id,
          updatedById: currentUser?.id
        }
      });

      const paymentNumber = paymentNumberForId(payment.id);
      await tx.payment.update({
        where: { id: payment.id },
        data: { paymentNumber, invoiceNumber: paymentNumber }
      });
      await recalculateInvoicePaymentTotals(tx, paymentData.invoiceId);

      return tx.payment.findUnique({ where: { id: payment.id }, include: paymentInclude });
    }, { isolationLevel: "Serializable" });

    await safelySendNotification(sendPaymentNotification, result.id, currentUser, { skipIfSent: true });
    return result;
  }

  const paymentData = await buildLegacyPaymentData(data, undefined, currentUser);
  const existingPayment = await prisma.payment.findUnique({
    where: { jobId: paymentData.jobId }
  });

  if (existingPayment) {
    throw new ApiError(409, "A payment or invoice already exists for this job");
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        ...paymentData,
        ...tenantData(currentUser),
        invoiceNumber: temporaryPaymentNumber(),
        paymentNumber: temporaryPaymentNumber(),
        createdById: currentUser?.id,
        updatedById: currentUser?.id
      }
    });

    const invoiceNumber = invoiceNumberForId(payment.id);
    return tx.payment.update({
      where: { id: payment.id },
      data: { invoiceNumber, paymentNumber: invoiceNumber },
      include: paymentInclude
    });
  });

  await safelySendNotification(sendPaymentNotification, result.id, currentUser, { skipIfSent: true });
  return result;
}

export async function updatePayment(id, data, currentUser) {
  const existingPayment = await prisma.payment.findFirst({ where: { id, ...tenantWhere(currentUser) } });

  if (!existingPayment) {
    throw new ApiError(404, "Payment not found");
  }

  if (existingPayment.invoiceId) {
    return prisma.$transaction(async (tx) => {
      const paymentData = await buildInvoicePaymentData({ ...data, invoiceId: existingPayment.invoiceId }, existingPayment, currentUser, tx);
      const payment = await tx.payment.update({
        where: { id },
        data: {
          ...paymentData,
          updatedById: currentUser?.id
        }
      });
      await recalculateInvoicePaymentTotals(tx, payment.invoiceId);
      return tx.payment.findUnique({ where: { id }, include: paymentInclude });
    }, { isolationLevel: "Serializable" });
  }

  const paymentData = await buildLegacyPaymentData(data, existingPayment, currentUser);

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
  const payment = await getPaymentById(id, currentUser);

  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });

    if (payment.invoiceId) {
      await recalculateInvoicePaymentTotals(tx, payment.invoiceId);
    }
  });
}
