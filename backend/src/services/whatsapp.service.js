import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { hasFeature } from "../utils/features.js";
import { isSystemAdmin, tenantWhere } from "../utils/tenant.js";
import { getWhatsAppProvider } from "./whatsappProviders.js";

export const whatsappTemplateCodes = [
  "QUOTATION_SENT",
  "INVOICE_SENT",
  "PAYMENT_RECEIVED",
  "JOB_ASSIGNED",
  "JOB_REMINDER",
  "CONTRACT_RENEWAL",
  "PAYMENT_REMINDER"
];

export const defaultWhatsAppTemplates = [
  {
    templateCode: "QUOTATION_SENT",
    templateName: "Quotation Sent",
    category: "SALES",
    messageBody: "Hello {{customer_name}}, your quotation {{quotation_number}} for {{amount}} is ready. View: {{document_link}}"
  },
  {
    templateCode: "INVOICE_SENT",
    templateName: "Invoice Sent",
    category: "FINANCE",
    messageBody: "Hello {{customer_name}}, invoice {{invoice_number}} for {{amount}} has been generated. View: {{document_link}}"
  },
  {
    templateCode: "PAYMENT_RECEIVED",
    templateName: "Payment Received",
    category: "FINANCE",
    messageBody: "Hello {{customer_name}}, payment of {{amount}} has been received. Receipt: {{document_link}}"
  },
  {
    templateCode: "JOB_ASSIGNED",
    templateName: "Job Assigned",
    category: "JOBS",
    messageBody: "Hello {{customer_name}}, your job is scheduled for {{job_date}} at {{job_time}}."
  },
  {
    templateCode: "JOB_REMINDER",
    templateName: "Job Reminder",
    category: "JOBS",
    messageBody: "Hello {{customer_name}}, reminder: your job is scheduled for {{job_date}} at {{job_time}}."
  },
  {
    templateCode: "CONTRACT_RENEWAL",
    templateName: "Contract Renewal",
    category: "CONTRACTS",
    messageBody: "Hello {{customer_name}}, contract {{contract_number}} expires on {{contract_end_date}}. Please contact us for renewal."
  },
  {
    templateCode: "PAYMENT_REMINDER",
    templateName: "Payment Reminder",
    category: "FINANCE",
    messageBody: "Hello {{customer_name}}, payment reminder for invoice {{invoice_number}}. Outstanding amount: {{amount}}. Due date: {{due_date}}."
  }
];

const providerTypes = ["MOCK", "META"];
const logStatuses = ["PENDING", "SENT", "DELIVERED", "FAILED"];

function assertAllowed(value, allowedValues, label) {
  if (value !== undefined && value !== null && value !== "" && !allowedValues.includes(value)) {
    throw new ApiError(400, `${label} is invalid`);
  }
}

function organizationIdForRequest(currentUser, data = {}) {
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

function maskSettings(settings) {
  if (!settings) {
    return null;
  }

  return {
    ...settings,
    apiKey: settings.apiKey ? "********" : null,
    accessToken: settings.accessToken ? "********" : null
  };
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function appUrl(path) {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function renderWhatsAppTemplate(body, variables = {}) {
  return String(body || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export async function ensureDefaultWhatsAppTemplates(organizationId, client = prisma) {
  for (const template of defaultWhatsAppTemplates) {
    await client.whatsAppTemplate.upsert({
      where: { organizationId_templateCode: { organizationId, templateCode: template.templateCode } },
      update: {},
      create: {
        organizationId,
        ...template,
        isSystemTemplate: true,
        isActive: true
      }
    });
  }
}

export async function getWhatsAppSettings(currentUser, query = {}) {
  const organizationId = organizationIdForRequest(currentUser, query);
  const settings = await prisma.whatsAppSetting.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" }
  });

  return maskSettings(settings);
}

export async function saveWhatsAppSettings(data, currentUser) {
  const organizationId = organizationIdForRequest(currentUser, data);
  assertAllowed(data.providerType, providerTypes, "Provider type");

  const existing = await prisma.whatsAppSetting.findFirst({ where: { organizationId } });
  const payload = {
    organizationId,
    providerType: data.providerType || existing?.providerType || "MOCK",
    apiKey: data.apiKey && data.apiKey !== "********" ? data.apiKey : existing?.apiKey || null,
    accessToken: data.accessToken && data.accessToken !== "********" ? data.accessToken : existing?.accessToken || null,
    phoneNumberId: data.phoneNumberId || null,
    businessAccountId: data.businessAccountId || null,
    senderNumber: data.senderNumber || null,
    isActive: Boolean(data.isActive)
  };

  const settings = existing
    ? await prisma.whatsAppSetting.update({ where: { id: existing.id }, data: payload })
    : await prisma.whatsAppSetting.create({ data: payload });

  await ensureDefaultWhatsAppTemplates(organizationId);
  return maskSettings(settings);
}

export async function setWhatsAppSettingsActive(data, currentUser) {
  const organizationId = organizationIdForRequest(currentUser, data);
  const settings = await prisma.whatsAppSetting.findFirst({ where: { organizationId } });
  if (!settings) {
    throw new ApiError(404, "WhatsApp settings not found");
  }

  return maskSettings(await prisma.whatsAppSetting.update({
    where: { id: settings.id },
    data: { isActive: Boolean(data.isActive) }
  }));
}

export async function testWhatsAppConnection(data, currentUser) {
  const organizationId = organizationIdForRequest(currentUser, data);
  const settings = await prisma.whatsAppSetting.findFirst({ where: { organizationId } });
  if (!settings || !settings.isActive) {
    throw new ApiError(400, "Active WhatsApp settings are required");
  }

  return getWhatsAppProvider(settings).testConnection();
}

export async function getWhatsAppTemplates(currentUser, query = {}) {
  const organizationId = organizationIdForRequest(currentUser, query);
  await ensureDefaultWhatsAppTemplates(organizationId);
  return prisma.whatsAppTemplate.findMany({
    where: {
      organizationId,
      isActive: query.isActive === undefined ? undefined : query.isActive === "true",
      templateCode: query.templateCode || undefined
    },
    orderBy: [{ category: "asc" }, { templateCode: "asc" }]
  });
}

export async function createWhatsAppTemplate(data, currentUser) {
  const organizationId = organizationIdForRequest(currentUser, data);
  if (!data.templateCode?.trim() || !data.templateName?.trim() || !data.messageBody?.trim()) {
    throw new ApiError(400, "Template code, name, and message body are required");
  }

  return prisma.whatsAppTemplate.create({
    data: {
      organizationId,
      templateCode: data.templateCode.trim().toUpperCase(),
      templateName: data.templateName.trim(),
      category: data.category || null,
      messageBody: data.messageBody.trim(),
      isSystemTemplate: false,
      isActive: data.isActive !== false
    }
  });
}

export async function updateWhatsAppTemplate(id, data, currentUser) {
  const template = await prisma.whatsAppTemplate.findFirst({ where: { id, ...tenantWhere(currentUser) } });
  if (!template) {
    throw new ApiError(404, "WhatsApp template not found");
  }

  return prisma.whatsAppTemplate.update({
    where: { id },
    data: {
      templateName: data.templateName?.trim(),
      category: data.category,
      messageBody: data.messageBody?.trim(),
      isActive: data.isActive === undefined ? undefined : Boolean(data.isActive)
    }
  });
}

export async function getWhatsAppLogs(currentUser, filters = {}) {
  const organizationId = organizationIdForRequest(currentUser, filters);
  assertAllowed(filters.status, logStatuses, "Log status");

  return prisma.whatsAppMessageLog.findMany({
    where: {
      organizationId,
      status: filters.status || undefined,
      templateCode: filters.templateCode || undefined,
      customerId: filters.customerId ? Number(filters.customerId) : undefined,
      quotationId: filters.quotationId ? Number(filters.quotationId) : undefined,
      invoiceId: filters.invoiceId ? Number(filters.invoiceId) : undefined,
      paymentId: filters.paymentId ? Number(filters.paymentId) : undefined,
      jobId: filters.jobId ? Number(filters.jobId) : undefined,
      contractId: filters.contractId ? Number(filters.contractId) : undefined,
      ...(filters.dateFrom || filters.dateTo ? {
        createdAt: {
          ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
          ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {})
        }
      } : {})
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, whatsapp: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

async function activeSettings(organizationId) {
  return prisma.whatsAppSetting.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "desc" }
  });
}

async function getTemplate(organizationId, templateCode) {
  await ensureDefaultWhatsAppTemplates(organizationId);
  return prisma.whatsAppTemplate.findFirst({
    where: { organizationId, templateCode, isActive: true }
  });
}

async function createFailureLog({ organizationId, templateCode, phoneNumber, messageBody, providerType = "UNKNOWN", errorMessage, related }) {
  return prisma.whatsAppMessageLog.create({
    data: {
      organizationId,
      phoneNumber: phoneNumber || "N/A",
      templateCode,
      messageBody: messageBody || "",
      providerType,
      status: "FAILED",
      errorMessage,
      ...related
    }
  });
}

export async function sendWhatsAppMessage({ organizationId, customer, templateCode, variables = {}, related = {}, phoneNumber, skipIfSent = false }) {
  if (!organizationId) {
    throw new ApiError(400, "Organization is required");
  }

  if (skipIfSent) {
    const existing = await prisma.whatsAppMessageLog.findFirst({
      where: {
        organizationId,
        templateCode,
        status: { in: ["PENDING", "SENT", "DELIVERED"] },
        quotationId: related.quotationId || undefined,
        invoiceId: related.invoiceId || undefined,
        paymentId: related.paymentId || undefined,
        jobId: related.jobId || undefined,
        contractId: related.contractId || undefined
      }
    });

    if (existing) {
      return existing;
    }
  }

  const allowed = await hasFeature({ organizationId, organization: { status: "ACTIVE" } }, "WHATSAPP");
  if (!allowed) {
    throw new ApiError(403, "Feature not available in your current plan.");
  }

  const settings = await activeSettings(organizationId);
  const template = await getTemplate(organizationId, templateCode);
  const to = cleanPhone(phoneNumber || customer?.whatsapp || customer?.phone);

  if (!template) {
    return createFailureLog({
      organizationId,
      templateCode,
      phoneNumber: to,
      errorMessage: "Active WhatsApp template not found",
      related
    });
  }

  const messageBody = renderWhatsAppTemplate(template.messageBody, variables);

  if (!settings) {
    return createFailureLog({
      organizationId,
      templateCode,
      phoneNumber: to,
      messageBody,
      errorMessage: "Active WhatsApp settings not configured",
      related
    });
  }

  const log = await prisma.whatsAppMessageLog.create({
    data: {
      organizationId,
      customerId: customer?.id || related.customerId || null,
      phoneNumber: to,
      templateCode,
      messageBody,
      providerType: settings.providerType,
      status: "PENDING",
      ...related
    }
  });

  try {
    const result = await getWhatsAppProvider(settings).sendMessage({ to, body: messageBody });
    return prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data: {
        status: result.status || "SENT",
        providerMessageId: result.providerMessageId,
        sentAt: new Date()
      }
    });
  } catch (error) {
    return prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        errorMessage: error.message || "WhatsApp send failed"
      }
    });
  }
}

export async function sendQuotationNotification(quotationId, currentUser, { skipIfSent = false } = {}) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, ...tenantWhere(currentUser) },
    include: { customer: true }
  });
  if (!quotation) throw new ApiError(404, "Quotation not found");

  return sendWhatsAppMessage({
    organizationId: quotation.organizationId,
    customer: quotation.customer,
    templateCode: "QUOTATION_SENT",
    variables: {
      customer_name: quotation.customer?.name,
      quotation_number: quotation.quotationNumber,
      amount: formatAmount(quotation.totalAmount),
      document_link: appUrl(`/quotations/${quotation.id}`)
    },
    related: { customerId: quotation.customerId, quotationId: quotation.id },
    skipIfSent
  });
}

export async function sendInvoiceNotification(invoiceId, currentUser, { skipIfSent = false } = {}) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...tenantWhere(currentUser) },
    include: { customer: true, contract: true }
  });
  if (!invoice) throw new ApiError(404, "Invoice not found");

  return sendWhatsAppMessage({
    organizationId: invoice.organizationId,
    customer: invoice.customer,
    templateCode: "INVOICE_SENT",
    variables: {
      customer_name: invoice.customer?.name,
      invoice_number: invoice.invoiceNumber,
      contract_number: invoice.contract?.contractNumber,
      amount: formatAmount(invoice.amount),
      due_date: formatDate(invoice.dueDate),
      document_link: appUrl(`/invoices/${invoice.id}`)
    },
    related: { customerId: invoice.customerId, invoiceId: invoice.id, contractId: invoice.contractId },
    skipIfSent
  });
}

export async function sendPaymentNotification(paymentId, currentUser, { skipIfSent = false } = {}) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, ...tenantWhere(currentUser) },
    include: { customer: true, invoice: true, contract: true }
  });
  if (!payment) throw new ApiError(404, "Payment not found");

  return sendWhatsAppMessage({
    organizationId: payment.organizationId,
    customer: payment.customer,
    templateCode: "PAYMENT_RECEIVED",
    variables: {
      customer_name: payment.customer?.name,
      invoice_number: payment.invoice?.invoiceNumber || payment.invoiceNumber,
      contract_number: payment.contract?.contractNumber,
      amount: formatAmount(payment.amount || payment.paidAmount),
      document_link: appUrl(`/payments/${payment.id}`)
    },
    related: { customerId: payment.customerId, paymentId: payment.id, invoiceId: payment.invoiceId, contractId: payment.contractId, jobId: payment.jobId },
    skipIfSent
  });
}

export async function sendJobNotification(jobId, currentUser, templateCode = "JOB_ASSIGNED", { skipIfSent = false } = {}) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, ...tenantWhere(currentUser) },
    include: { customer: true, assignedStaff: true, assignedAgent: true }
  });
  if (!job) throw new ApiError(404, "Job not found");

  return sendWhatsAppMessage({
    organizationId: job.organizationId,
    customer: job.customer,
    templateCode,
    variables: {
      customer_name: job.customer?.name,
      job_date: formatDate(job.scheduledDate),
      job_time: job.scheduledTime,
      assigned_staff: job.assignedStaff?.name || job.assignedAgent?.name || "Team"
    },
    related: { customerId: job.customerId, jobId: job.id },
    skipIfSent
  });
}

export async function sendContractNotification(contractId, currentUser, templateCode = "CONTRACT_RENEWAL", { skipIfSent = false } = {}) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, ...tenantWhere(currentUser) },
    include: { customer: true }
  });
  if (!contract) throw new ApiError(404, "Contract not found");

  return sendWhatsAppMessage({
    organizationId: contract.organizationId,
    customer: contract.customer,
    templateCode,
    variables: {
      customer_name: contract.customer?.name,
      contract_number: contract.contractNumber,
      contract_title: contract.title,
      contract_end_date: formatDate(contract.endDate),
      amount: formatAmount(contract.contractValue)
    },
    related: { customerId: contract.customerId, contractId: contract.id },
    skipIfSent
  });
}

function notificationUser(organizationId) {
  return { organizationId, organization: { status: "ACTIVE" } };
}

export async function safelySendNotification(fn, ...args) {
  try {
    return await fn(...args);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(`WhatsApp notification skipped: ${error.message}`);
    }
    return null;
  }
}

export async function runJobReminders() {
  const targetStart = new Date();
  targetStart.setHours(targetStart.getHours() + 23, 0, 0, 0);
  const targetEnd = new Date();
  targetEnd.setHours(targetEnd.getHours() + 25, 59, 59, 999);

  const jobs = await prisma.job.findMany({
    where: { status: "SCHEDULED", scheduledDate: { gte: targetStart, lte: targetEnd } },
    select: { id: true, organizationId: true }
  });

  for (const job of jobs) {
    await safelySendNotification(sendJobNotification, job.id, notificationUser(job.organizationId), "JOB_REMINDER", { skipIfSent: true });
  }
}

export async function runContractRenewalReminders() {
  const now = new Date();
  for (const days of [90, 60, 30]) {
    const start = new Date(now);
    start.setDate(start.getDate() + days);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const contracts = await prisma.contract.findMany({
      where: { status: "ACTIVE", endDate: { gte: start, lte: end } },
      select: { id: true, organizationId: true }
    });

    for (const contract of contracts) {
      await safelySendNotification(sendContractNotification, contract.id, notificationUser(contract.organizationId), "CONTRACT_RENEWAL", { skipIfSent: true });
    }
  }
}

export async function runPaymentReminders() {
  const now = new Date();
  for (const offset of [7, 0, -7]) {
    const start = new Date(now);
    start.setDate(start.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        status: { notIn: ["PAID", "CANCELLED"] },
        balanceAmount: { gt: 0 }
      },
      include: { customer: true }
    });

    for (const invoice of invoices) {
      await sendWhatsAppMessage({
        organizationId: invoice.organizationId,
        customer: invoice.customer,
        templateCode: "PAYMENT_REMINDER",
        variables: {
          customer_name: invoice.customer?.name,
          invoice_number: invoice.invoiceNumber,
          amount: formatAmount(invoice.balanceAmount || invoice.amount),
          due_date: formatDate(invoice.dueDate),
          document_link: appUrl(`/invoices/${invoice.id}`)
        },
        related: { customerId: invoice.customerId, invoiceId: invoice.id },
        skipIfSent: true
      }).catch((error) => {
        if (process.env.NODE_ENV !== "test") console.warn(`Payment reminder skipped: ${error.message}`);
      });
    }
  }
}
