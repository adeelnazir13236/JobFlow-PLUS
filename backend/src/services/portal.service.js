import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { hasFeature } from "../utils/features.js";

const requestTypes = ["NEW_SERVICE", "COMPLAINT", "REVISIT", "EMERGENCY", "GENERAL"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const requestStatuses = ["OPEN", "IN_REVIEW", "CONVERTED_TO_JOB", "CLOSED", "CANCELLED"];

function signPortalToken(user) {
  return jwt.sign(
    { id: user.id, type: "CUSTOMER_PORTAL", organizationId: user.organizationId, customerId: user.customerId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicPortalUser(user) {
  return {
    id: user.id,
    organizationId: user.organizationId,
    customerId: user.customerId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    organization: user.organization,
    customer: user.customer
  };
}

function whereForPortal(portalUser) {
  return { organizationId: portalUser.organizationId, customerId: portalUser.customerId };
}

function validateEnum(value, allowedValues, label) {
  if (value !== undefined && value !== null && value !== "" && !allowedValues.includes(value)) {
    throw new ApiError(400, `${label} is invalid`);
  }
}

function requestNumberForId(id) {
  return `SR-${String(id).padStart(6, "0")}`;
}

function tempRequestNumber() {
  return `TMP-SR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export async function loginPortalCustomer(data) {
  const login = String(data.login || "").trim();
  const password = data.password;

  if (!login || !password) {
    throw new ApiError(400, "Email or phone and password are required");
  }

  const user = await prisma.customerPortalUser.findFirst({
    where: {
      OR: [{ email: login }, { phone: login }]
    },
    include: {
      organization: { select: { id: true, name: true, status: true, plan: true } },
      customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true, address: true, area: true, city: true, status: true } }
    }
  });

  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(401, "Invalid portal credentials");
  }

  if (user.organization.status !== "ACTIVE") {
    throw new ApiError(403, "Customer portal access is inactive. Please contact support.");
  }

  const portalAllowed = await hasFeature({ organizationId: user.organizationId, organization: user.organization }, "CUSTOMER_PORTAL");
  if (!portalAllowed) {
    throw new ApiError(403, "Customer portal is not available in your current plan.");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid portal credentials");
  }

  await prisma.customerPortalUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token: signPortalToken(user), user: publicPortalUser(user) };
}

export function getPortalMe(portalUser) {
  return publicPortalUser(portalUser);
}

export async function changePortalPassword(portalUser, data) {
  if (!data.currentPassword || !data.newPassword || data.newPassword.length < 6) {
    throw new ApiError(400, "Current password and a new password of at least 6 characters are required");
  }

  const existing = await prisma.customerPortalUser.findUnique({ where: { id: portalUser.id } });
  const matches = await bcrypt.compare(data.currentPassword, existing.passwordHash);
  if (!matches) {
    throw new ApiError(400, "Current password is incorrect");
  }

  await prisma.customerPortalUser.update({
    where: { id: portalUser.id },
    data: { passwordHash: await bcrypt.hash(data.newPassword, 10) }
  });
}

export async function getPortalDashboard(portalUser) {
  const where = whereForPortal(portalUser);
  const now = new Date();

  const [activeContracts, upcomingJobs, pendingQuotations, outstandingInvoices, recentPayments, openRequests, recentJobs, recentInvoices] = await Promise.all([
    prisma.contract.count({ where: { ...where, status: "ACTIVE" } }),
    prisma.job.count({ where: { ...where, status: { in: ["SCHEDULED", "RESCHEDULED"] }, scheduledDate: { gte: now } } }),
    prisma.quotation.count({ where: { ...where, status: { in: ["DRAFT", "SENT"] } } }),
    prisma.invoice.count({ where: { ...where, status: { notIn: ["PAID", "CANCELLED"] }, balanceAmount: { gt: 0 } } }),
    prisma.payment.findMany({ where, orderBy: { createdAt: "desc" }, take: 5, include: { invoice: true } }),
    prisma.serviceRequest.count({ where: { ...where, status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.job.findMany({ where, orderBy: { scheduledDate: "desc" }, take: 5 }),
    prisma.invoice.findMany({ where, orderBy: { invoiceDate: "desc" }, take: 5 })
  ]);

  return {
    cards: { activeContracts, upcomingJobs, pendingQuotations, outstandingInvoices, recentPayments: recentPayments.length, openRequests },
    recentJobs,
    recentInvoices,
    recentPayments
  };
}

export async function getPortalQuotations(portalUser) {
  return prisma.quotation.findMany({
    where: whereForPortal(portalUser),
    include: { items: true },
    orderBy: { quotationDate: "desc" }
  });
}

export async function getPortalQuotationById(id, portalUser) {
  const quotation = await prisma.quotation.findFirst({
    where: { id, ...whereForPortal(portalUser) },
    include: { items: true, customer: true }
  });
  if (!quotation) throw new ApiError(404, "Quotation not found");
  return quotation;
}

export async function setPortalQuotationStatus(id, status, portalUser) {
  validateEnum(status, ["ACCEPTED", "REJECTED"], "Quotation status");
  const quotation = await getPortalQuotationById(id, portalUser);

  if (!["DRAFT", "SENT", "ACCEPTED", "REJECTED"].includes(quotation.status) || quotation.convertedToType) {
    throw new ApiError(400, "This quotation cannot be approved or rejected");
  }

  if (["CONVERTED", "CANCELLED", "EXPIRED"].includes(quotation.status)) {
    throw new ApiError(400, "This quotation cannot be approved or rejected");
  }

  return prisma.quotation.update({
    where: { id },
    data: { status },
    include: { items: true, customer: true }
  });
}

export async function getPortalContracts(portalUser) {
  return prisma.contract.findMany({
    where: whereForPortal(portalUser),
    include: { services: true, jobLinks: { include: { job: true } }, invoices: true },
    orderBy: { endDate: "asc" }
  });
}

export async function getPortalContractById(id, portalUser) {
  const contract = await prisma.contract.findFirst({
    where: { id, ...whereForPortal(portalUser) },
    include: { services: true, jobLinks: { include: { job: true, contractService: true } }, invoices: true }
  });
  if (!contract) throw new ApiError(404, "Contract not found");
  return contract;
}

export async function getPortalJobs(portalUser) {
  return prisma.job.findMany({
    where: whereForPortal(portalUser),
    include: { assignedStaff: { select: { id: true, name: true } }, contractLinks: { include: { contract: true } } },
    orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "asc" }]
  });
}

export async function getPortalJobById(id, portalUser) {
  const job = await prisma.job.findFirst({
    where: { id, ...whereForPortal(portalUser) },
    include: { assignedStaff: { select: { id: true, name: true } }, contractLinks: { include: { contract: true, contractService: true } } }
  });
  if (!job) throw new ApiError(404, "Job not found");
  return job;
}

export async function getPortalInvoices(portalUser) {
  return prisma.invoice.findMany({
    where: whereForPortal(portalUser),
    include: { contract: true, payments: true },
    orderBy: { invoiceDate: "desc" }
  });
}

export async function getPortalInvoiceById(id, portalUser) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...whereForPortal(portalUser) },
    include: { contract: true, payments: true, customer: true }
  });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  return invoice;
}

export async function getPortalPayments(portalUser) {
  return prisma.payment.findMany({
    where: whereForPortal(portalUser),
    include: { invoice: true, contract: true, job: true },
    orderBy: { paymentDate: "desc" }
  });
}

export async function getPortalPaymentById(id, portalUser) {
  const payment = await prisma.payment.findFirst({
    where: { id, ...whereForPortal(portalUser) },
    include: { invoice: true, contract: true, job: true, customer: true }
  });
  if (!payment) throw new ApiError(404, "Payment not found");
  return payment;
}

export async function getPortalServiceRequests(portalUser) {
  return prisma.serviceRequest.findMany({
    where: whereForPortal(portalUser),
    include: { relatedContract: true, relatedJob: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getPortalServiceRequestById(id, portalUser) {
  const request = await prisma.serviceRequest.findFirst({
    where: { id, ...whereForPortal(portalUser) },
    include: { relatedContract: true, relatedJob: true }
  });
  if (!request) throw new ApiError(404, "Service request not found");
  return request;
}

export async function createPortalServiceRequest(data, portalUser) {
  validateEnum(data.requestType, requestTypes, "Request type");
  validateEnum(data.priority, priorities, "Priority");

  if (!data.title?.trim() || !data.description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const relatedContractId = data.relatedContractId ? Number(data.relatedContractId) : null;
  const relatedJobId = data.relatedJobId ? Number(data.relatedJobId) : null;

  if (relatedContractId) {
    const contract = await prisma.contract.findFirst({ where: { id: relatedContractId, ...whereForPortal(portalUser) } });
    if (!contract) throw new ApiError(404, "Related contract not found");
  }

  if (relatedJobId) {
    const job = await prisma.job.findFirst({ where: { id: relatedJobId, ...whereForPortal(portalUser) } });
    if (!job) throw new ApiError(404, "Related job not found");
  }

  const request = await prisma.serviceRequest.create({
    data: {
      organizationId: portalUser.organizationId,
      customerId: portalUser.customerId,
      portalUserId: portalUser.id,
      requestNumber: tempRequestNumber(),
      requestType: data.requestType || "GENERAL",
      title: data.title.trim(),
      description: data.description.trim(),
      priority: data.priority || "MEDIUM",
      relatedContractId,
      relatedJobId
    }
  });

  return prisma.serviceRequest.update({
    where: { id: request.id },
    data: { requestNumber: requestNumberForId(request.id) },
    include: { relatedContract: true, relatedJob: true }
  });
}

export { requestTypes, priorities, requestStatuses, whereForPortal };
