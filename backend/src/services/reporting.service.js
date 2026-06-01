import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { isSystemAdmin } from "../utils/tenant.js";

const dayMs = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * dayMs);
}

function monthKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function quarterKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-Q${Math.floor(value.getMonth() / 3) + 1}`;
}

function yearKey(date) {
  return String(new Date(date).getFullYear());
}

function number(value) {
  return Number(value || 0);
}

function sumBy(items, field) {
  return items.reduce((total, item) => total + number(item[field]), 0);
}

function groupSum(items, keyFn, valueFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, number(map.get(key)) + number(valueFn(item)));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
}

function groupCount(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, number(map.get(key)) + 1);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
}

function dateRange(query = {}) {
  const from = query.from ? startOfDay(query.from) : startOfDay(addDays(new Date(), -365));
  const to = query.to ? endOfDay(query.to) : endOfDay(new Date());

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new ApiError(400, "Report date range is invalid");
  }

  if (from > to) {
    throw new ApiError(400, "Report start date must be before end date");
  }

  return { from, to };
}

function scopedWhere(user, query = {}) {
  if (isSystemAdmin(user)) {
    return query.organizationId ? { organizationId: Number(query.organizationId) } : {};
  }

  if (!user?.organizationId) {
    throw new ApiError(403, "User is not assigned to an organization");
  }

  return { organizationId: user.organizationId };
}

function dateWhere(field, from, to) {
  return { [field]: { gte: from, lte: to } };
}

async function paymentRows(user, query = {}) {
  const { from, to } = dateRange(query);
  return prisma.payment.findMany({
    where: { ...scopedWhere(user, query), ...dateWhere("paymentDate", from, to) },
    include: { customer: { select: { id: true, name: true } }, contract: { select: { id: true, contractNumber: true, title: true } } },
    orderBy: { paymentDate: "asc" }
  });
}

async function invoiceRows(user, query = {}) {
  const { from, to } = dateRange(query);
  return prisma.invoice.findMany({
    where: { ...scopedWhere(user, query), ...dateWhere("invoiceDate", from, to) },
    include: { customer: { select: { id: true, name: true } }, contract: { select: { id: true, contractNumber: true, title: true } } },
    orderBy: { invoiceDate: "asc" }
  });
}

async function jobRows(user, query = {}) {
  const { from, to } = dateRange(query);
  return prisma.job.findMany({
    where: { ...scopedWhere(user, query), ...dateWhere("scheduledDate", from, to) },
    include: {
      customer: { select: { id: true, name: true } },
      assignedStaff: { select: { id: true, name: true } }
    },
    orderBy: { scheduledDate: "asc" }
  });
}

function overdueInvoiceWhere(now = new Date()) {
  return { dueDate: { lt: now }, balanceAmount: { gt: 0 }, status: { notIn: ["PAID", "CANCELLED"] } };
}

export async function getExecutiveDashboardReport(user, query = {}) {
  const now = new Date();
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const quarterStart = startOfDay(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
  const yearStart = startOfDay(new Date(now.getFullYear(), 0, 1));
  const base = scopedWhere(user, query);

  const [
    monthPayments,
    quarterPayments,
    yearPayments,
    generatedInvoices,
    paidInvoices,
    outstandingInvoices,
    overdueInvoices,
    activeContracts,
    expiringContracts,
    cancelledContracts,
    createdJobs,
    completedJobs,
    pendingJobs,
    missedJobs,
    totalCustomers,
    newCustomers,
    activeCustomers,
    openRequests,
    closedRequests,
    revenueTrend,
    invoiceTrend,
    jobTrend
  ] = await Promise.all([
    prisma.payment.findMany({ where: { ...base, paymentDate: { gte: monthStart, lte: now } } }),
    prisma.payment.findMany({ where: { ...base, paymentDate: { gte: quarterStart, lte: now } } }),
    prisma.payment.findMany({ where: { ...base, paymentDate: { gte: yearStart, lte: now } } }),
    prisma.invoice.count({ where: base }),
    prisma.invoice.count({ where: { ...base, status: "PAID" } }),
    prisma.invoice.aggregate({ where: { ...base, balanceAmount: { gt: 0 }, status: { notIn: ["PAID", "CANCELLED"] } }, _sum: { balanceAmount: true } }),
    prisma.invoice.count({ where: { ...base, ...overdueInvoiceWhere(now) } }),
    prisma.contract.count({ where: { ...base, status: "ACTIVE" } }),
    prisma.contract.count({ where: { ...base, status: "ACTIVE", endDate: { gte: now, lte: addDays(now, 30) } } }),
    prisma.contract.count({ where: { ...base, status: "CANCELLED" } }),
    prisma.job.count({ where: base }),
    prisma.job.count({ where: { ...base, status: "COMPLETED" } }),
    prisma.job.count({ where: { ...base, status: { in: ["SCHEDULED", "RESCHEDULED"] } } }),
    prisma.job.count({ where: { ...base, status: { in: ["SCHEDULED", "RESCHEDULED"] }, scheduledDate: { lt: startOfDay(now) } } }),
    prisma.customer.count({ where: base }),
    prisma.customer.count({ where: { ...base, createdAt: { gte: monthStart, lte: now } } }),
    prisma.customer.count({ where: { ...base, status: "ACTIVE" } }),
    prisma.serviceRequest.count({ where: { ...base, status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.serviceRequest.count({ where: { ...base, status: "CLOSED" } }),
    getRevenueReport(user, { ...query, from: yearStart.toISOString(), to: now.toISOString() }),
    getInvoiceReport(user, { ...query, from: yearStart.toISOString(), to: now.toISOString() }),
    getJobCompletionTrendReport(user, { ...query, from: yearStart.toISOString(), to: now.toISOString() })
  ]);

  return {
    cards: {
      revenueThisMonth: sumBy(monthPayments, "paidAmount") || sumBy(monthPayments, "amount"),
      revenueThisQuarter: sumBy(quarterPayments, "paidAmount") || sumBy(quarterPayments, "amount"),
      revenueThisYear: sumBy(yearPayments, "paidAmount") || sumBy(yearPayments, "amount"),
      outstandingBalance: number(outstandingInvoices._sum.balanceAmount),
      activeContracts,
      pendingJobs,
      openServiceRequests: openRequests
    },
    revenue: {
      thisMonth: sumBy(monthPayments, "paidAmount") || sumBy(monthPayments, "amount"),
      thisQuarter: sumBy(quarterPayments, "paidAmount") || sumBy(quarterPayments, "amount"),
      thisYear: sumBy(yearPayments, "paidAmount") || sumBy(yearPayments, "amount")
    },
    invoices: {
      generated: generatedInvoices,
      paid: paidInvoices,
      outstanding: number(outstandingInvoices._sum.balanceAmount),
      overdue: overdueInvoices
    },
    contracts: {
      active: activeContracts,
      expiringSoon: expiringContracts,
      renewed: 0,
      cancelled: cancelledContracts
    },
    jobs: { created: createdJobs, completed: completedJobs, pending: pendingJobs, missed: missedJobs },
    customers: { total: totalCustomers, newThisMonth: newCustomers, activeCustomers },
    serviceRequests: { open: openRequests, closed: closedRequests },
    charts: {
      revenueTrend: revenueTrend.byMonth,
      invoiceTrend: invoiceTrend.byMonth,
      jobCompletionTrend: jobTrend.byMonth
    }
  };
}

export async function getRevenueReport(user, query = {}) {
  const payments = await paymentRows(user, query);
  const value = (payment) => number(payment.paidAmount || payment.amount);
  return {
    byMonth: groupSum(payments, (payment) => monthKey(payment.paymentDate), value),
    byQuarter: groupSum(payments, (payment) => quarterKey(payment.paymentDate), value),
    byYear: groupSum(payments, (payment) => yearKey(payment.paymentDate), value),
    totalRevenue: payments.reduce((sum, payment) => sum + value(payment), 0)
  };
}

export async function getInvoiceReport(user, query = {}) {
  const invoices = await invoiceRows(user, query);
  return {
    summary: {
      generated: invoices.length,
      paid: invoices.filter((invoice) => invoice.status === "PAID").length,
      outstanding: invoices.filter((invoice) => number(invoice.balanceAmount) > 0 && !["PAID", "CANCELLED"].includes(invoice.status)).length,
      overdue: invoices.filter((invoice) => invoice.dueDate && new Date(invoice.dueDate) < new Date() && number(invoice.balanceAmount) > 0).length,
      totalAmount: sumBy(invoices, "amount"),
      outstandingAmount: sumBy(invoices, "balanceAmount")
    },
    byStatus: groupCount(invoices, (invoice) => invoice.status),
    byMonth: groupSum(invoices, (invoice) => monthKey(invoice.invoiceDate), (invoice) => invoice.amount),
    rows: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer?.name,
      contract: invoice.contract?.contractNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      amount: number(invoice.amount),
      paidAmount: number(invoice.paidAmount),
      balanceAmount: number(invoice.balanceAmount),
      status: invoice.status
    }))
  };
}

export async function getPaymentReport(user, query = {}) {
  const payments = await paymentRows(user, query);
  return {
    summary: {
      count: payments.length,
      totalReceived: payments.reduce((sum, payment) => sum + number(payment.paidAmount || payment.amount), 0)
    },
    byMethod: groupSum(payments, (payment) => payment.paymentMethod, (payment) => payment.paidAmount || payment.amount),
    trends: groupSum(payments, (payment) => monthKey(payment.paymentDate), (payment) => payment.paidAmount || payment.amount),
    rows: payments.map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber || payment.invoiceNumber,
      customer: payment.customer?.name,
      paymentDate: payment.paymentDate,
      amount: number(payment.paidAmount || payment.amount),
      method: payment.paymentMethod,
      status: payment.paymentStatus
    }))
  };
}

export async function getOutstandingBalanceReport(user, query = {}) {
  const rows = await prisma.invoice.findMany({
    where: { ...scopedWhere(user, query), balanceAmount: { gt: 0 }, status: { notIn: ["PAID", "CANCELLED"] } },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" }
  });
  const now = new Date();
  const byCustomer = new Map();

  for (const invoice of rows) {
    const key = invoice.customerId;
    const entry = byCustomer.get(key) || {
      customerId: key,
      customer: invoice.customer?.name,
      invoiceCount: 0,
      outstandingAmount: 0,
      current: 0,
      days1To30: 0,
      days31To60: 0,
      days61To90: 0,
      days90Plus: 0
    };
    const amount = number(invoice.balanceAmount);
    const age = invoice.dueDate ? Math.floor((now - new Date(invoice.dueDate)) / dayMs) : 0;
    entry.invoiceCount += 1;
    entry.outstandingAmount += amount;
    if (age <= 0) entry.current += amount;
    else if (age <= 30) entry.days1To30 += amount;
    else if (age <= 60) entry.days31To60 += amount;
    else if (age <= 90) entry.days61To90 += amount;
    else entry.days90Plus += amount;
    byCustomer.set(key, entry);
  }

  return { rows: [...byCustomer.values()].sort((a, b) => b.outstandingAmount - a.outstandingAmount) };
}

export async function getActiveContractsReport(user, query = {}) {
  const contracts = await prisma.contract.findMany({
    where: { ...scopedWhere(user, query), status: "ACTIVE" },
    include: { customer: true, services: true },
    orderBy: { endDate: "asc" }
  });
  return {
    rows: contracts.map((contract) => {
      const total = contract.services.reduce((sum, service) => sum + service.totalJobs, 0);
      const completed = contract.services.reduce((sum, service) => sum + service.completedJobs, 0);
      return {
        id: contract.id,
        contractNumber: contract.contractNumber,
        customer: contract.customer?.name,
        startDate: contract.startDate,
        endDate: contract.endDate,
        contractValue: number(contract.contractValue),
        progress: total ? Math.round((completed / total) * 100) : 0,
        completedVisits: completed,
        totalVisits: total
      };
    })
  };
}

export async function getExpiringContractsReport(user, query = {}) {
  const days = Number(query.days || 30);
  const now = new Date();
  const contracts = await prisma.contract.findMany({
    where: { ...scopedWhere(user, query), status: "ACTIVE", endDate: { gte: now, lte: addDays(now, days) } },
    include: { customer: true },
    orderBy: { endDate: "asc" }
  });
  return { days, rows: contracts.map((contract) => ({ id: contract.id, contractNumber: contract.contractNumber, customer: contract.customer?.name, endDate: contract.endDate, contractValue: number(contract.contractValue) })) };
}

export async function getContractRevenueReport(user, query = {}) {
  const invoices = await invoiceRows(user, query);
  const byContract = new Map();
  const byCustomer = new Map();
  for (const invoice of invoices.filter((item) => item.contractId)) {
    const contractKey = invoice.contract?.contractNumber || `Contract #${invoice.contractId}`;
    byContract.set(contractKey, number(byContract.get(contractKey)) + number(invoice.paidAmount || invoice.amount));
    const customerKey = invoice.customer?.name || `Customer #${invoice.customerId}`;
    byCustomer.set(customerKey, number(byCustomer.get(customerKey)) + number(invoice.paidAmount || invoice.amount));
  }
  return {
    byContract: [...byContract.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byCustomer: [...byCustomer.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  };
}

export async function getContractPerformanceReport(user, query = {}) {
  const active = await getActiveContractsReport(user, query);
  return {
    rows: active.rows.map((row) => ({
      ...row,
      remainingVisits: Math.max(row.totalVisits - row.completedVisits, 0),
      completionPercentage: row.progress
    }))
  };
}

export async function getJobSummaryReport(user, query = {}) {
  const jobs = await jobRows(user, query);
  return {
    summary: {
      totalJobs: jobs.length,
      completedJobs: jobs.filter((job) => job.status === "COMPLETED").length,
      cancelledJobs: jobs.filter((job) => job.status === "CANCELLED").length,
      missedJobs: jobs.filter((job) => ["SCHEDULED", "RESCHEDULED"].includes(job.status) && new Date(job.scheduledDate) < startOfDay(new Date())).length
    }
  };
}

export async function getJobStatusReport(user, query = {}) {
  const jobs = await jobRows(user, query);
  return {
    byStatus: groupCount(jobs, (job) => job.status),
    byMonth: groupCount(jobs, (job) => `${monthKey(job.scheduledDate)} ${job.status}`),
    byCustomer: groupCount(jobs, (job) => job.customer?.name || "Unassigned")
  };
}

export async function getJobCompletionTrendReport(user, query = {}) {
  const jobs = (await jobRows(user, query)).filter((job) => job.status === "COMPLETED");
  return {
    byDay: groupCount(jobs, (job) => new Date(job.completionDate || job.scheduledDate).toISOString().slice(0, 10)),
    byMonth: groupCount(jobs, (job) => monthKey(job.completionDate || job.scheduledDate))
  };
}

export async function getTechnicianPerformanceReport(user, query = {}) {
  const jobs = await jobRows(user, query);
  const byStaff = new Map();
  for (const job of jobs) {
    const key = job.assignedStaff?.name || "Unassigned";
    const entry = byStaff.get(key) || { technician: key, jobsAssigned: 0, jobsCompleted: 0, completionRate: 0 };
    entry.jobsAssigned += 1;
    if (job.status === "COMPLETED") entry.jobsCompleted += 1;
    byStaff.set(key, entry);
  }
  return {
    rows: [...byStaff.values()].map((entry) => ({ ...entry, completionRate: entry.jobsAssigned ? Math.round((entry.jobsCompleted / entry.jobsAssigned) * 100) : 0 }))
  };
}

export async function getCustomerSummaryReport(user, query = {}) {
  const { from, to } = dateRange(query);
  const base = scopedWhere(user, query);
  return {
    summary: {
      totalCustomers: await prisma.customer.count({ where: base }),
      activeCustomers: await prisma.customer.count({ where: { ...base, status: "ACTIVE" } }),
      newCustomers: await prisma.customer.count({ where: { ...base, createdAt: { gte: from, lte: to } } })
    }
  };
}

export async function getCustomerRevenueReport(user, query = {}) {
  const [customers, invoices, payments, quotations] = await Promise.all([
    prisma.customer.findMany({ where: scopedWhere(user, query), select: { id: true, name: true } }),
    invoiceRows(user, query),
    paymentRows(user, query),
    prisma.quotation.findMany({ where: scopedWhere(user, query), select: { customerId: true } })
  ]);
  return {
    rows: customers.map((customer) => ({
      customerId: customer.id,
      customer: customer.name,
      totalQuotations: quotations.filter((quotation) => quotation.customerId === customer.id).length,
      totalInvoices: invoices.filter((invoice) => invoice.customerId === customer.id).length,
      totalPayments: payments.filter((payment) => payment.customerId === customer.id).length,
      revenueGenerated: payments.filter((payment) => payment.customerId === customer.id).reduce((sum, payment) => sum + number(payment.paidAmount || payment.amount), 0)
    })).sort((a, b) => b.revenueGenerated - a.revenueGenerated)
  };
}

export async function getTopCustomersReport(user, query = {}) {
  const rows = (await getCustomerRevenueReport(user, query)).rows;
  const jobs = await jobRows(user, query);
  const contracts = await prisma.contract.findMany({ where: scopedWhere(user, query), select: { customerId: true } });
  return {
    byRevenue: rows.slice(0, 10),
    byJobs: rows.map((row) => ({ ...row, jobs: jobs.filter((job) => job.customerId === row.customerId).length })).sort((a, b) => b.jobs - a.jobs).slice(0, 10),
    byContracts: rows.map((row) => ({ ...row, contracts: contracts.filter((contract) => contract.customerId === row.customerId).length })).sort((a, b) => b.contracts - a.contracts).slice(0, 10)
  };
}

async function serviceRequestRows(user, query = {}) {
  const { from, to } = dateRange(query);
  return prisma.serviceRequest.findMany({
    where: { ...scopedWhere(user, query), ...dateWhere("createdAt", from, to) },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
}

export async function getServiceRequestReport(user, query = {}) {
  const rows = await serviceRequestRows(user, query);
  return {
    open: rows.filter((request) => ["OPEN", "IN_REVIEW"].includes(request.status)),
    closed: rows.filter((request) => request.status === "CLOSED"),
    byType: groupCount(rows, (request) => request.requestType),
    performance: {
      averageResolutionHours: 0,
      openVsClosed: [
        { label: "Open", count: rows.filter((request) => ["OPEN", "IN_REVIEW"].includes(request.status)).length },
        { label: "Closed", count: rows.filter((request) => request.status === "CLOSED").length }
      ]
    }
  };
}

export async function getChartReport(user, query = {}) {
  const [revenue, jobs, invoices, payments, contracts, requests] = await Promise.all([
    getRevenueReport(user, query),
    getJobCompletionTrendReport(user, query),
    getInvoiceReport(user, query),
    getPaymentReport(user, query),
    getActiveContractsReport(user, query),
    getServiceRequestReport(user, query)
  ]);

  return {
    revenueTrend: revenue.byMonth,
    jobsTrend: jobs.byMonth,
    invoicesTrend: invoices.byMonth,
    paymentsTrend: payments.trends,
    contractTrend: groupCount(contracts.rows, (contract) => monthKey(contract.endDate)),
    serviceRequestTrend: requests.byType
  };
}
