import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { isSystemAdmin, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";
import { safelySendNotification, sendQuotationNotification } from "./whatsapp.service.js";

const quotationStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"];
const discountTypes = ["FIXED", "PERCENTAGE"];
const userSelect = { id: true, name: true, email: true, role: true };

const quotationInclude = {
  customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true, address: true, area: true, city: true } },
  createdBy: { select: userSelect },
  convertedJob: { select: { id: true, scheduledDate: true, scheduledTime: true, status: true } },
  convertedContract: { select: { id: true, contractNumber: true, title: true, status: true } },
  items: { orderBy: { createdAt: "asc" } }
};

function organizationIdForUser(currentUser) {
  if (!currentUser?.organizationId) {
    throw new ApiError(403, "User is not assigned to an organization");
  }

  return currentUser.organizationId;
}

function validateOptionalEnum(value, allowedValues, label) {
  if (value !== undefined && value !== null && value !== "" && !allowedValues.includes(value)) {
    throw new ApiError(400, `${label} is invalid`);
  }
}

function amountValue(value, label, min = 0) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < min) {
    throw new ApiError(400, `${label} must be ${min > 0 ? "greater than zero" : "a valid non-negative amount"}`);
  }

  return amount;
}

function dateValue(value, label, fallback) {
  if (!value && fallback) {
    return fallback;
  }

  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${label} is required`);
  }

  return date;
}

function temporaryQuotationNumber() {
  return `TMP-QUO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function quotationNumberForId(id) {
  return `QUO-${String(id).padStart(6, "0")}`;
}

function contractNumberForQuotation(quotation) {
  return `CON-${quotation.quotationNumber}`;
}

function normalizeItem(item) {
  const quantity = amountValue(item.quantity ?? 1, "Quantity", 0.01);
  const unitPrice = amountValue(item.unitPrice ?? item.unit_price ?? 0, "Unit price");

  if (!item.itemName?.trim() && !item.item_name?.trim()) {
    throw new ApiError(400, "Item name is required");
  }

  return {
    itemName: (item.itemName || item.item_name).trim(),
    description: item.description || null,
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice
  };
}

function calculateTotals(items, discountType, discountValue, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const safeDiscountValue = amountValue(discountValue || 0, "Discount value");
  const safeTaxRate = amountValue(taxRate || 0, "Tax rate");
  let discountAmount = 0;

  if (discountType === "PERCENTAGE") {
    if (safeDiscountValue > 100) {
      throw new ApiError(400, "Discount percentage cannot exceed 100");
    }
    discountAmount = subtotal * (safeDiscountValue / 100);
  } else if (discountType === "FIXED") {
    discountAmount = safeDiscountValue;
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxableAmount * (safeTaxRate / 100);
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount
  };
}

async function recalculateQuotationTotals(tx, quotationId) {
  const quotation = await tx.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true }
  });

  if (!quotation) {
    throw new ApiError(404, "Quotation not found");
  }

  const totals = calculateTotals(quotation.items, quotation.discountType, quotation.discountValue, quotation.taxRate);

  return tx.quotation.update({
    where: { id: quotationId },
    data: totals,
    include: quotationInclude
  });
}

async function validateCustomer(tx, customerId, organizationId) {
  const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId } });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

async function getQuotationForUpdate(tx, id, currentUser) {
  const quotation = await tx.quotation.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: { items: true }
  });

  if (!quotation) {
    throw new ApiError(404, "Quotation not found");
  }

  return quotation;
}

export async function getQuotations(currentUser, filters = {}) {
  return prisma.quotation.findMany({
    where: {
      ...tenantWhere(currentUser),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.customerId ? { customerId: Number(filters.customerId) } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            quotationDate: {
              ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
              ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {})
            }
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { quotationNumber: { contains: filters.search } },
              { title: { contains: filters.search } },
              { customer: { name: { contains: filters.search } } }
            ]
          }
        : {})
    },
    include: quotationInclude,
    orderBy: { createdAt: "desc" }
  });
}

export async function getQuotationById(id, currentUser) {
  const quotation = await prisma.quotation.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: quotationInclude
  });

  if (!quotation) {
    throw new ApiError(404, "Quotation not found");
  }

  return quotation;
}

export async function createQuotation(data, currentUser) {
  const customerId = Number(data.customerId);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new ApiError(400, "Customer is required");
  }

  if (!data.title?.trim()) {
    throw new ApiError(400, "Quotation title is required");
  }

  validateOptionalEnum(data.discountType, discountTypes, "Discount type");
  validateEnum(data.status, quotationStatuses, "Quotation status");

  const quotationDate = dateValue(data.quotationDate, "Quotation date", new Date());
  const validUntil = data.validUntil ? new Date(data.validUntil) : null;
  const discountType = data.discountType || null;
  const discountValue = amountValue(data.discountValue || 0, "Discount value");
  const taxRate = amountValue(data.taxRate || 0, "Tax rate");
  const items = Array.isArray(data.items) ? data.items.map(normalizeItem) : [];
  const totals = calculateTotals(items, discountType, discountValue, taxRate);

  return prisma.$transaction(async (tx) => {
    const organizationId = isSystemAdmin(currentUser)
      ? (await tx.customer.findUnique({ where: { id: customerId }, select: { organizationId: true } }))?.organizationId
      : organizationIdForUser(currentUser);

    if (!organizationId) {
      throw new ApiError(404, "Customer not found");
    }

    await validateCustomer(tx, customerId, organizationId);

    const quotation = await tx.quotation.create({
      data: {
        organizationId,
        customerId,
        quotationNumber: data.quotationNumber?.trim() || temporaryQuotationNumber(),
        title: data.title.trim(),
        description: data.description || null,
        quotationDate,
        validUntil,
        status: data.status || "DRAFT",
        discountType,
        discountValue,
        taxRate,
        notes: data.notes || null,
        terms: data.terms || null,
        createdByUserId: currentUser?.id,
        ...totals,
        items: items.length
          ? { create: items.map((item) => ({ ...item, organizationId })) }
          : undefined
      },
      include: quotationInclude
    });

    if (!data.quotationNumber) {
      return tx.quotation.update({
        where: { id: quotation.id },
        data: { quotationNumber: quotationNumberForId(quotation.id) },
        include: quotationInclude
      });
    }

    return quotation;
  });
}

export async function updateQuotation(id, data, currentUser) {
  validateOptionalEnum(data.discountType, discountTypes, "Discount type");
  validateEnum(data.status, quotationStatuses, "Quotation status");

  return prisma.$transaction(async (tx) => {
    const quotation = await getQuotationForUpdate(tx, id, currentUser);
    const customerId = data.customerId ? Number(data.customerId) : undefined;

    if (customerId) {
      await validateCustomer(tx, customerId, quotation.organizationId);
    }

    await tx.quotation.update({
      where: { id },
      data: {
        customerId,
        title: data.title?.trim(),
        description: data.description,
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : data.validUntil === null ? null : undefined,
        status: data.status,
        discountType: data.discountType === "" ? null : data.discountType,
        discountValue: data.discountValue === undefined ? undefined : amountValue(data.discountValue, "Discount value"),
        taxRate: data.taxRate === undefined ? undefined : amountValue(data.taxRate, "Tax rate"),
        notes: data.notes,
        terms: data.terms
      }
    });

    if (Array.isArray(data.items)) {
      await tx.quotationItem.deleteMany({ where: { quotationId: id, organizationId: quotation.organizationId } });
      const items = data.items.map(normalizeItem);

      if (items.length) {
        await tx.quotationItem.createMany({
          data: items.map((item) => ({ ...item, quotationId: id, organizationId: quotation.organizationId }))
        });
      }
    }

    return recalculateQuotationTotals(tx, id);
  });
}

export async function setQuotationStatus(id, status, currentUser) {
  validateEnum(status, quotationStatuses, "Quotation status");
  const existingQuotation = await getQuotationById(id, currentUser);

  const quotation = await prisma.quotation.update({
    where: { id },
    data: { status },
    include: quotationInclude
  });

  if (status === "SENT" && existingQuotation.status !== "SENT") {
    await safelySendNotification(sendQuotationNotification, id, currentUser, { skipIfSent: true });
  }

  return quotation;
}

export async function deleteQuotation(id, currentUser) {
  const quotation = await getQuotationById(id, currentUser);

  if (quotation.convertedJobId || quotation.convertedContractId || quotation.status === "CONVERTED") {
    throw new ApiError(400, "Converted quotations cannot be deleted");
  }

  if (quotation.status === "DRAFT") {
    await prisma.quotation.delete({ where: { id } });
    return null;
  }

  return prisma.quotation.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: quotationInclude
  });
}

export async function addQuotationItem(quotationId, data, currentUser) {
  return prisma.$transaction(async (tx) => {
    const quotation = await getQuotationForUpdate(tx, quotationId, currentUser);
    const item = normalizeItem(data);

    await tx.quotationItem.create({
      data: {
        ...item,
        organizationId: quotation.organizationId,
        quotationId
      }
    });

    return recalculateQuotationTotals(tx, quotationId);
  });
}

export async function updateQuotationItem(quotationId, itemId, data, currentUser) {
  return prisma.$transaction(async (tx) => {
    const quotation = await getQuotationForUpdate(tx, quotationId, currentUser);
    const existingItem = await tx.quotationItem.findFirst({
      where: { id: itemId, quotationId, organizationId: quotation.organizationId }
    });

    if (!existingItem) {
      throw new ApiError(404, "Quotation item not found");
    }

    const merged = {
      itemName: data.itemName ?? existingItem.itemName,
      description: data.description ?? existingItem.description,
      quantity: data.quantity ?? existingItem.quantity,
      unitPrice: data.unitPrice ?? existingItem.unitPrice
    };
    const item = normalizeItem(merged);

    await tx.quotationItem.update({ where: { id: itemId }, data: item });
    return recalculateQuotationTotals(tx, quotationId);
  });
}

export async function deleteQuotationItem(quotationId, itemId, currentUser) {
  return prisma.$transaction(async (tx) => {
    const quotation = await getQuotationForUpdate(tx, quotationId, currentUser);
    const existingItem = await tx.quotationItem.findFirst({
      where: { id: itemId, quotationId, organizationId: quotation.organizationId }
    });

    if (!existingItem) {
      throw new ApiError(404, "Quotation item not found");
    }

    await tx.quotationItem.delete({ where: { id: itemId } });
    return recalculateQuotationTotals(tx, quotationId);
  });
}

function assertCanConvert(quotation) {
  if (quotation.convertedToType || quotation.convertedJobId || quotation.convertedContractId) {
    throw new ApiError(409, "Quotation has already been converted");
  }

  if (quotation.status !== "ACCEPTED") {
    throw new ApiError(400, "Only accepted quotations can be converted");
  }
}

export async function convertQuotationToJob(id, data, currentUser) {
  return prisma.$transaction(async (tx) => {
    const quotation = await getQuotationForUpdate(tx, id, currentUser);
    assertCanConvert(quotation);

    const scheduledDate = dateValue(data.scheduledDate, "Scheduled date", new Date());
    const scheduledTime = data.scheduledTime || "09:00";

    const job = await tx.job.create({
      data: {
        organizationId: quotation.organizationId,
        customerId: quotation.customerId,
        scheduledDate,
        scheduledTime,
        status: "SCHEDULED",
        createdById: currentUser?.id,
        updatedById: currentUser?.id,
        remarks: [quotation.title, quotation.description, quotation.notes].filter(Boolean).join("\n\n")
      }
    });

    return tx.quotation.update({
      where: { id },
      data: {
        status: "CONVERTED",
        convertedToType: "JOB",
        convertedJobId: job.id
      },
      include: quotationInclude
    });
  });
}

export async function convertQuotationToContract(id, data, currentUser) {
  return prisma.$transaction(async (tx) => {
    const quotation = await getQuotationForUpdate(tx, id, currentUser);
    assertCanConvert(quotation);

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate ? new Date(data.endDate) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());

    const contract = await tx.contract.create({
      data: {
        organizationId: quotation.organizationId,
        customerId: quotation.customerId,
        contractNumber: data.contractNumber?.trim() || contractNumberForQuotation(quotation),
        title: quotation.title,
        description: [quotation.description, quotation.notes, quotation.terms].filter(Boolean).join("\n\n"),
        startDate,
        endDate,
        contractValue: quotation.totalAmount,
        status: "DRAFT",
        createdByUserId: currentUser?.id
      }
    });

    return tx.quotation.update({
      where: { id },
      data: {
        status: "CONVERTED",
        convertedToType: "CONTRACT",
        convertedContractId: contract.id
      },
      include: quotationInclude
    });
  });
}
