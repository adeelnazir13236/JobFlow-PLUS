import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";

const billingCycles = ["MONTHLY", "HALF_YEARLY", "YEARLY"];
const invoiceStatuses = ["GENERATED", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

function addMonths(date, months) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value;
}

function endOfPreviousDay(date) {
  const value = new Date(date);
  value.setDate(value.getDate() - 1);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function amountForPlan(plan, billingCycle) {
  if (billingCycle === "YEARLY") return Number(plan.yearlyPrice || 0);
  if (billingCycle === "HALF_YEARLY") return Number(plan.halfYearlyPrice || 0) || Number(plan.monthlyPrice || 0) * 6;
  return Number(plan.monthlyPrice || 0);
}

function monthsForCycle(billingCycle) {
  if (billingCycle === "YEARLY") return 12;
  if (billingCycle === "HALF_YEARLY") return 6;
  return 1;
}

function invoiceNumberFor(id) {
  return `ORG-INV-${String(id).padStart(6, "0")}`;
}

function paymentNumberFor(id) {
  return `ORG-PAY-${String(id).padStart(6, "0")}`;
}

async function updateOverdueInvoices() {
  await prisma.organizationBillingInvoice.updateMany({
    where: {
      status: { in: ["GENERATED", "SENT", "PARTIALLY_PAID"] },
      balanceAmount: { gt: 0 },
      dueDate: { lt: startOfDay(new Date()) }
    },
    data: { status: "OVERDUE" }
  });
}

export async function getBillingSummary() {
  await updateOverdueInvoices();
  const [invoices, payments] = await Promise.all([
    prisma.organizationBillingInvoice.findMany(),
    prisma.organizationBillingPayment.findMany()
  ]);

  return {
    totalInvoices: invoices.length,
    generated: invoices.filter((invoice) => invoice.status === "GENERATED" || invoice.status === "SENT").length,
    paid: invoices.filter((invoice) => invoice.status === "PAID").length,
    overdue: invoices.filter((invoice) => invoice.status === "OVERDUE").length,
    totalBilled: invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    totalReceived: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balanceAmount || 0), 0)
  };
}

export async function listBillingInvoices(filters = {}) {
  await updateOverdueInvoices();
  return prisma.organizationBillingInvoice.findMany({
    where: {
      organizationId: filters.organizationId ? Number(filters.organizationId) : undefined,
      status: filters.status || undefined,
      billingCycle: filters.billingCycle || undefined
    },
    include: {
      organization: { select: { id: true, name: true, email: true } },
      plan: true,
      subscription: true,
      payments: { orderBy: { paymentDate: "desc" } }
    },
    orderBy: { invoiceDate: "desc" }
  });
}

export async function getBillingInvoice(id) {
  const invoice = await prisma.organizationBillingInvoice.findUnique({
    where: { id },
    include: {
      organization: true,
      plan: true,
      subscription: true,
      payments: { orderBy: { paymentDate: "desc" } }
    }
  });

  if (!invoice) {
    throw new ApiError(404, "Organization billing invoice not found");
  }

  return invoice;
}

export async function createBillingInvoice(data) {
  const organizationId = Number(data.organizationId);
  const subscriptionId = data.subscriptionId ? Number(data.subscriptionId) : null;
  const billingCycle = data.billingCycle || "MONTHLY";

  if (!organizationId) throw new ApiError(400, "Organization is required");
  if (!billingCycles.includes(billingCycle)) throw new ApiError(400, "Billing cycle is invalid");

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new ApiError(404, "Organization not found");

  const subscription = subscriptionId
    ? await prisma.organizationSubscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } })
    : await prisma.organizationSubscription.findFirst({ where: { organizationId, status: "ACTIVE" }, include: { plan: true }, orderBy: { createdAt: "desc" } });

  if (!subscription || subscription.organizationId !== organizationId) {
    throw new ApiError(400, "A valid organization subscription is required");
  }

  const periodStart = data.periodStart ? new Date(data.periodStart) : new Date();
  const periodEnd = data.periodEnd ? new Date(data.periodEnd) : endOfPreviousDay(addMonths(periodStart, monthsForCycle(billingCycle)));
  const amount = data.amount !== undefined ? Number(data.amount) : amountForPlan(subscription.plan, billingCycle);
  const paidAmount = amount === 0 ? 0 : 0;
  const created = await prisma.organizationBillingInvoice.create({
    data: {
      organizationId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      invoiceNumber: `TMP-ORG-INV-${Date.now()}`,
      billingCycle,
      periodStart,
      periodEnd,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : addDays(new Date(), 10),
      amount,
      paidAmount,
      balanceAmount: amount,
      status: data.status || (amount === 0 ? "PAID" : "GENERATED"),
      notes: data.notes || null
    }
  });

  return prisma.organizationBillingInvoice.update({
    where: { id: created.id },
    data: { invoiceNumber: invoiceNumberFor(created.id) },
    include: { organization: true, plan: true, payments: true }
  });
}

export async function generateDueBillingInvoices() {
  const subscriptions = await prisma.organizationSubscription.findMany({
    where: { status: "ACTIVE", organization: { status: "ACTIVE" } },
    include: { organization: true, plan: true }
  });
  const created = [];
  const today = startOfDay(new Date());

  for (const subscription of subscriptions) {
    const billingCycle = billingCycles.includes(subscription.billingCycle) ? subscription.billingCycle : "MONTHLY";
    const latestInvoice = await prisma.organizationBillingInvoice.findFirst({
      where: { subscriptionId: subscription.id },
      orderBy: { periodEnd: "desc" }
    });
    const periodStart = latestInvoice ? addDays(latestInvoice.periodEnd, 1) : subscription.startDate;

    if (startOfDay(periodStart) > today) {
      continue;
    }

    const existing = await prisma.organizationBillingInvoice.findFirst({
      where: { subscriptionId: subscription.id, periodStart: startOfDay(periodStart) }
    });
    if (existing) {
      continue;
    }

    created.push(await createBillingInvoice({
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      billingCycle,
      periodStart,
      periodEnd: endOfPreviousDay(addMonths(periodStart, monthsForCycle(billingCycle)))
    }));
  }

  return created;
}

export async function updateBillingInvoiceStatus(id, status) {
  if (!invoiceStatuses.includes(status)) {
    throw new ApiError(400, "Invoice status is invalid");
  }

  await getBillingInvoice(id);
  return prisma.organizationBillingInvoice.update({
    where: { id },
    data: { status },
    include: { organization: true, plan: true, payments: true }
  });
}

export async function recordBillingPayment(invoiceId, data) {
  const invoice = await getBillingInvoice(invoiceId);
  if (invoice.status === "CANCELLED") {
    throw new ApiError(400, "Cannot record payment against a cancelled invoice");
  }

  const amount = Number(data.amount);
  if (!amount || amount <= 0) {
    throw new ApiError(400, "Payment amount must be greater than zero");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.organizationBillingPayment.create({
      data: {
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        paymentNumber: `TMP-ORG-PAY-${Date.now()}`,
        amount,
        paymentMethod: data.paymentMethod || "BANK_TRANSFER",
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null
      }
    });

    const paidAmount = Number(invoice.paidAmount || 0) + amount;
    const balanceAmount = Math.max(Number(invoice.amount || 0) - paidAmount, 0);
    const status = balanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";

    await tx.organizationBillingPayment.update({
      where: { id: payment.id },
      data: { paymentNumber: paymentNumberFor(payment.id) }
    });

    return tx.organizationBillingInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount, balanceAmount, status },
      include: { organization: true, plan: true, payments: { orderBy: { paymentDate: "desc" } } }
    });
  });
}

export { billingCycles, invoiceStatuses };
