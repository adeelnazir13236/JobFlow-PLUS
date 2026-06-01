import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { hasFeature } from "../utils/features.js";
import { isSystemAdmin, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";
import { safelySendNotification, sendInvoiceNotification } from "./whatsapp.service.js";

const contractStatuses = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "EXPIRED", "CANCELLED"];
const serviceStatuses = ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"];
const frequencyTypes = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"];
const billingTypes = ["MONTHLY", "QUARTERLY", "YEARLY", "PER_VISIT", "CUSTOM"];

const userSelect = { id: true, name: true, email: true, role: true };

const contractInclude = {
  customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true, address: true, area: true, city: true } },
  createdBy: { select: userSelect },
  services: {
    include: { assignedUser: { select: userSelect } },
    orderBy: { createdAt: "asc" }
  },
  billingRules: { orderBy: { createdAt: "asc" } },
  jobLinks: {
    include: {
      contractService: true,
      job: {
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          assignedStaff: { select: userSelect }
        }
      }
    },
    orderBy: { jobSequenceNumber: "asc" }
  },
  invoices: {
    include: { payments: { include: { receivedBy: { select: userSelect } }, orderBy: { paymentDate: "desc" } } },
    orderBy: { invoiceDate: "desc" }
  }
};

function numberValue(value, label, { min = 0 } = {}) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < min) {
    throw new ApiError(400, `${label} must be ${min > 0 ? "greater than zero" : "a valid non-negative amount"}`);
  }

  return amount;
}

function integerValue(value, label, { min = 1 } = {}) {
  const integer = Number(value);

  if (!Number.isInteger(integer) || integer < min) {
    throw new ApiError(400, `${label} must be an integer greater than or equal to ${min}`);
  }

  return integer;
}

function dateValue(value, label) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${label} is required`);
  }

  return date;
}

function addMonths(date, months) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function calculateNextJobDate(baseDate, frequencyType, interval) {
  const safeInterval = Math.max(Number(interval || 1), 1);

  if (frequencyType === "DAILY") {
    return addDays(baseDate, safeInterval);
  }

  if (frequencyType === "WEEKLY") {
    return addDays(baseDate, safeInterval * 7);
  }

  if (frequencyType === "MONTHLY") {
    return addMonths(baseDate, safeInterval);
  }

  if (frequencyType === "QUARTERLY") {
    return addMonths(baseDate, safeInterval * 3);
  }

  if (frequencyType === "YEARLY") {
    return addMonths(baseDate, safeInterval * 12);
  }

  return addDays(baseDate, safeInterval);
}

function scopedOrganizationId(data, currentUser) {
  if (isSystemAdmin(currentUser)) {
    const organizationId = Number(data.organizationId);
    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      throw new ApiError(400, "Organization is required");
    }
    return organizationId;
  }

  if (!currentUser?.organizationId) {
    throw new ApiError(403, "User is not assigned to an organization");
  }

  return currentUser.organizationId;
}

async function validateCustomer(tx, customerId, organizationId) {
  const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId } });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

async function validateAssignedUser(tx, assignedUserId, organizationId) {
  if (!assignedUserId) {
    return null;
  }

  const user = await tx.user.findFirst({ where: { id: Number(assignedUserId), organizationId } });

  if (!user) {
    throw new ApiError(400, "Assigned user must belong to the same organization");
  }

  return user;
}

function temporaryInvoiceNumber() {
  return `TMP-CON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function invoiceNumberForId(id) {
  return `CINV-${String(id).padStart(6, "0")}`;
}

function withContractFinancialSummary(contract) {
  if (!contract) {
    return contract;
  }

  const invoices = contract.invoices || [];
  const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const totalPaidAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
  const totalOutstandingAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceAmount || invoice.amount || 0), 0);

  return {
    ...contract,
    financialSummary: {
      contractValue: Number(contract.contractValue || 0),
      totalInvoiceAmount,
      totalPaidAmount,
      totalOutstandingAmount,
      invoiceCount: invoices.length,
      paidInvoices: invoices.filter((invoice) => invoice.paymentStatus === "PAID" || invoice.status === "PAID").length,
      unpaidInvoices: invoices.filter((invoice) => Number(invoice.paidAmount || 0) <= 0 && invoice.status !== "CANCELLED").length,
      partiallyPaidInvoices: invoices.filter((invoice) => invoice.paymentStatus === "PARTIALLY_PAID" || invoice.status === "PARTIALLY_PAID").length
    }
  };
}

async function createContractJob(tx, contract, service, sequenceNumber, scheduledDate) {
  const existingLink = await tx.contractJobLink.findFirst({
    where: {
      organizationId: contract.organizationId,
      contractServiceId: service.id,
      jobSequenceNumber: sequenceNumber
    }
  });

  if (existingLink) {
    return existingLink;
  }

  const job = await tx.job.create({
    data: {
      organizationId: contract.organizationId,
      customerId: contract.customerId,
      assignedStaffId: service.assignedUserId || undefined,
      scheduledDate,
      scheduledTime: service.preferredTime || "09:00",
      status: "SCHEDULED",
      createdById: contract.createdByUserId || undefined,
      updatedById: contract.createdByUserId || undefined,
      remarks: `Contract ${contract.contractNumber} - ${service.serviceName} #${sequenceNumber}`
    }
  });

  return tx.contractJobLink.create({
    data: {
      organizationId: contract.organizationId,
      contractId: contract.id,
      contractServiceId: service.id,
      jobId: job.id,
      jobSequenceNumber: sequenceNumber
    }
  });
}

async function applyBillingTriggers(tx, contract, completedJobs) {
  const rules = await tx.contractBillingRule.findMany({
    where: {
      organizationId: contract.organizationId,
      contractId: contract.id,
      status: "ACTIVE"
    }
  });

  for (const rule of rules) {
    if (completedJobs - rule.lastInvoicedCompletedJobCount < rule.invoiceAfterCompletedJobs) {
      continue;
    }

    const existingInvoice = await tx.invoice.findFirst({
      where: {
        organizationId: contract.organizationId,
        billingRuleId: rule.id,
        notes: { contains: `completed jobs ${completedJobs}` }
      }
    });

    if (existingInvoice) {
      continue;
    }

    const invoice = await tx.invoice.create({
      data: {
        organizationId: contract.organizationId,
        customerId: contract.customerId,
        contractId: contract.id,
        billingRuleId: rule.id,
        invoiceNumber: temporaryInvoiceNumber(),
        invoiceDate: new Date(),
        dueDate: addDays(new Date(), 15),
        amount: rule.invoiceAmount,
        paidAmount: 0,
        balanceAmount: rule.invoiceAmount,
        status: "GENERATED",
        paymentStatus: "GENERATED",
        notes: `Auto-generated for ${contract.contractNumber} after completed jobs ${completedJobs}`
      }
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { invoiceNumber: invoiceNumberForId(invoice.id) }
    });

    setTimeout(() => {
      safelySendNotification(
        sendInvoiceNotification,
        invoice.id,
        { organizationId: contract.organizationId, organization: { status: "ACTIVE" } },
        { skipIfSent: true }
      );
    }, 0);

    await tx.contractBillingRule.update({
      where: { id: rule.id },
      data: {
        lastInvoicedCompletedJobCount: completedJobs,
        nextInvoiceDueAfterJobs: completedJobs + rule.invoiceAfterCompletedJobs
      }
    });
  }
}

export async function getContracts(currentUser, filters = {}) {
  const where = {
    ...tenantWhere(currentUser),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: Number(filters.customerId) } : {}),
    ...(filters.search
      ? {
          OR: [
            { contractNumber: { contains: filters.search } },
            { title: { contains: filters.search } },
            { customer: { name: { contains: filters.search } } }
          ]
        }
      : {})
  };

  const contracts = await prisma.contract.findMany({
    where,
    include: contractInclude,
    orderBy: { createdAt: "desc" }
  });

  return contracts.map(withContractFinancialSummary);
}

export async function getContractById(id, currentUser) {
  const contract = await prisma.contract.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: contractInclude
  });

  if (!contract) {
    throw new ApiError(404, "Contract not found");
  }

  return withContractFinancialSummary(contract);
}

export async function createContract(data, currentUser) {
  const organizationId = scopedOrganizationId(data, currentUser);
  const customerId = integerValue(data.customerId, "Customer");
  const startDate = dateValue(data.startDate, "Start date");
  const endDate = dateValue(data.endDate, "End date");

  if (endDate < startDate) {
    throw new ApiError(400, "End date must be after start date");
  }

  if (!data.title?.trim()) {
    throw new ApiError(400, "Contract title is required");
  }

  return prisma.$transaction(async (tx) => {
    await validateCustomer(tx, customerId, organizationId);

    const contract = await tx.contract.create({
      data: {
        organizationId,
        customerId,
        contractNumber: data.contractNumber?.trim() || `CON-${Date.now()}`,
        title: data.title.trim(),
        description: data.description || null,
        startDate,
        endDate,
        contractValue: data.contractValue !== undefined ? numberValue(data.contractValue, "Contract value") : 0,
        status: "DRAFT",
        createdByUserId: currentUser?.id
      },
      include: contractInclude
    });

    return withContractFinancialSummary(contract);
  });
}

export async function updateContract(id, data, currentUser) {
  const existingContract = await getContractById(id, currentUser);
  validateEnum(data.status, contractStatuses, "Contract status");

  const organizationId = existingContract.organizationId;
  const customerId = data.customerId ? integerValue(data.customerId, "Customer") : undefined;

  return prisma.$transaction(async (tx) => {
    if (customerId) {
      await validateCustomer(tx, customerId, organizationId);
    }

    const contract = await tx.contract.update({
      where: { id },
      data: {
        customerId,
        title: data.title?.trim(),
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        contractValue: data.contractValue !== undefined ? numberValue(data.contractValue, "Contract value") : undefined,
        status: data.status
      },
      include: contractInclude
    });

    return withContractFinancialSummary(contract);
  });
}

export async function activateContract(id, currentUser) {
  await getContractById(id, currentUser);

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { services: true }
    });

    for (const service of contract.services.filter((row) => row.status === "ACTIVE")) {
      if (!service.nextJobDate || service.totalJobs <= 0) {
        continue;
      }

      await createContractJob(tx, contract, service, 1, service.nextJobDate);
    }

    const updatedContract = await tx.contract.findUnique({ where: { id }, include: contractInclude });
    return withContractFinancialSummary(updatedContract);
  });
}

export async function setContractStatus(id, status, currentUser) {
  validateEnum(status, contractStatuses, "Contract status");
  await getContractById(id, currentUser);

  const contract = await prisma.contract.update({
    where: { id },
    data: { status },
    include: contractInclude
  });
  return withContractFinancialSummary(contract);
}

export async function deleteContract(id, currentUser) {
  const contract = await getContractById(id, currentUser);

  if (contract.jobLinks.length || contract.invoices.length) {
    return setContractStatus(id, "CANCELLED", currentUser);
  }

  await prisma.contract.delete({ where: { id } });
  return null;
}

export async function addContractService(contractId, data, currentUser) {
  const contract = await getContractById(contractId, currentUser);

  validateEnum(data.frequencyType, frequencyTypes, "Frequency type");
  validateEnum(data.status, serviceStatuses, "Service status");

  if (!data.serviceName?.trim()) {
    throw new ApiError(400, "Service name is required");
  }

  const totalJobs = integerValue(data.totalJobs, "Total jobs");
  const frequencyInterval = integerValue(data.frequencyInterval || 1, "Frequency interval");

  return prisma.$transaction(async (tx) => {
    await validateAssignedUser(tx, data.assignedUserId, contract.organizationId);

    return tx.contractService.create({
      data: {
        organizationId: contract.organizationId,
        contractId,
        serviceName: data.serviceName.trim(),
        description: data.description || null,
        frequencyType: data.frequencyType,
        frequencyInterval,
        totalJobs,
        nextJobDate: data.nextJobDate ? new Date(data.nextJobDate) : contract.startDate,
        preferredTime: data.preferredTime || null,
        assignedUserId: data.assignedUserId ? Number(data.assignedUserId) : null,
        generateNextOnCompletion: data.generateNextOnCompletion !== false,
        status: data.status || "ACTIVE"
      }
    });
  });
}

export async function updateContractService(contractId, serviceId, data, currentUser) {
  const contract = await getContractById(contractId, currentUser);
  const service = contract.services.find((row) => row.id === serviceId);

  if (!service) {
    throw new ApiError(404, "Contract service not found");
  }

  validateEnum(data.frequencyType, frequencyTypes, "Frequency type");
  validateEnum(data.status, serviceStatuses, "Service status");

  return prisma.$transaction(async (tx) => {
    await validateAssignedUser(tx, data.assignedUserId, contract.organizationId);

    return tx.contractService.update({
      where: { id: serviceId },
      data: {
        serviceName: data.serviceName?.trim(),
        description: data.description,
        frequencyType: data.frequencyType,
        frequencyInterval: data.frequencyInterval ? integerValue(data.frequencyInterval, "Frequency interval") : undefined,
        totalJobs: data.totalJobs ? integerValue(data.totalJobs, "Total jobs") : undefined,
        nextJobDate: data.nextJobDate ? new Date(data.nextJobDate) : data.nextJobDate === null ? null : undefined,
        preferredTime: data.preferredTime,
        assignedUserId: data.assignedUserId === null ? null : data.assignedUserId ? Number(data.assignedUserId) : undefined,
        generateNextOnCompletion: data.generateNextOnCompletion,
        status: data.status
      }
    });
  });
}

export async function addBillingRule(contractId, data, currentUser) {
  const contract = await getContractById(contractId, currentUser);
  validateEnum(data.billingType, billingTypes, "Billing type");

  const invoiceAfterCompletedJobs = integerValue(data.invoiceAfterCompletedJobs, "Invoice after completed jobs");

  return prisma.contractBillingRule.create({
    data: {
      organizationId: contract.organizationId,
      contractId,
      billingType: data.billingType,
      billingCycle: data.billingCycle || data.billingType,
      invoiceAfterCompletedJobs,
      invoiceAmount: numberValue(data.invoiceAmount, "Invoice amount", { min: 1 }),
      lastInvoicedCompletedJobCount: Number(data.lastInvoicedCompletedJobCount || 0),
      nextInvoiceDueAfterJobs: Number(data.nextInvoiceDueAfterJobs || invoiceAfterCompletedJobs),
      status: data.status || "ACTIVE"
    }
  });
}

export async function updateBillingRule(contractId, ruleId, data, currentUser) {
  const contract = await getContractById(contractId, currentUser);
  const rule = contract.billingRules.find((row) => row.id === ruleId);

  if (!rule) {
    throw new ApiError(404, "Billing rule not found");
  }

  validateEnum(data.billingType, billingTypes, "Billing type");

  return prisma.contractBillingRule.update({
    where: { id: ruleId },
    data: {
      billingType: data.billingType,
      billingCycle: data.billingCycle,
      invoiceAfterCompletedJobs: data.invoiceAfterCompletedJobs ? integerValue(data.invoiceAfterCompletedJobs, "Invoice after completed jobs") : undefined,
      invoiceAmount: data.invoiceAmount !== undefined ? numberValue(data.invoiceAmount, "Invoice amount", { min: 1 }) : undefined,
      lastInvoicedCompletedJobCount: data.lastInvoicedCompletedJobCount === undefined ? undefined : Number(data.lastInvoicedCompletedJobCount),
      nextInvoiceDueAfterJobs: data.nextInvoiceDueAfterJobs === undefined ? undefined : Number(data.nextInvoiceDueAfterJobs),
      status: data.status
    }
  });
}

export async function getContractInvoices(contractId, currentUser) {
  const contract = await getContractById(contractId, currentUser);

  return prisma.invoice.findMany({
    where: { contractId: contract.id, organizationId: contract.organizationId },
    include: { customer: true, contract: true, billingRule: true, payments: { include: { receivedBy: { select: userSelect } }, orderBy: { paymentDate: "desc" } } },
    orderBy: { invoiceDate: "desc" }
  });
}

export async function getInvoices(currentUser) {
  return prisma.invoice.findMany({
    where: tenantWhere(currentUser),
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      contract: { select: { id: true, contractNumber: true, title: true } },
      billingRule: true,
      payments: { include: { receivedBy: { select: userSelect } }, orderBy: { paymentDate: "desc" } }
    },
    orderBy: { invoiceDate: "desc" }
  });
}

export async function getInvoiceById(id, currentUser) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: {
      customer: true,
      contract: true,
      billingRule: true,
      payments: { include: { receivedBy: { select: userSelect } }, orderBy: { paymentDate: "desc" } }
    }
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  return invoice;
}

export async function handleContractJobCompletion(tx, job, currentUser) {
  const link = await tx.contractJobLink.findUnique({
    where: { jobId: job.id },
    include: {
      contract: true,
      contractService: true
    }
  });

  if (!link || link.contract.organizationId !== job.organizationId) {
    return;
  }

  if (link.contract.status !== "ACTIVE" || link.contractService.status !== "ACTIVE") {
    return;
  }

  const recurringAllowed = await hasFeature(currentUser, "RECURRING_JOBS");
  const invoicesAllowed = await hasFeature(currentUser, "INVOICES");
  const completedJobs = Math.max(link.contractService.completedJobs, link.jobSequenceNumber);
  const serviceCompleted = completedJobs >= link.contractService.totalJobs;

  await tx.contractService.update({
    where: { id: link.contractServiceId },
    data: {
      completedJobs,
      status: serviceCompleted ? "COMPLETED" : undefined
    }
  });

  if (invoicesAllowed) {
    await applyBillingTriggers(tx, link.contract, completedJobs);
  }

  if (!recurringAllowed || serviceCompleted || !link.contractService.generateNextOnCompletion) {
    const activeServices = await tx.contractService.count({
      where: { contractId: link.contractId, status: "ACTIVE" }
    });

    if (activeServices === 0) {
      await tx.contract.update({ where: { id: link.contractId }, data: { status: "COMPLETED" } });
    }

    return;
  }

  const nextSequence = link.jobSequenceNumber + 1;
  const nextDate = calculateNextJobDate(job.scheduledDate, link.contractService.frequencyType, link.contractService.frequencyInterval);

  await createContractJob(tx, link.contract, link.contractService, nextSequence, nextDate);
  await tx.contractService.update({
    where: { id: link.contractServiceId },
    data: { nextJobDate: nextDate }
  });
}
