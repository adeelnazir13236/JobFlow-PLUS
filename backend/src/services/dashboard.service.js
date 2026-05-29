import prisma from "../config/prisma.js";
import { isSystemAdmin, tenantWhere } from "../utils/tenant.js";

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function getDashboardSummary(currentUser) {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();
  const tenant = tenantWhere(currentUser);

  const [
    totalCustomers,
    todaysScheduledJobs,
    pendingFollowUps,
    completedJobsThisMonth,
    cancelledJobs,
    totalRevenue,
    pendingPayments,
    paidPayments,
    partialPayments,
    todaysJobs,
    overdueFollowUps,
    recentCallLogs
  ] = await Promise.all([
    prisma.customer.count({ where: tenant }),
    prisma.job.count({
      where: {
        ...tenant,
        status: "SCHEDULED",
        scheduledDate: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.followUp.count({
      where: {
        ...tenant,
        status: "PENDING",
        followUpDate: { lte: todayEnd }
      }
    }),
    prisma.job.count({
      where: {
        ...tenant,
        status: "COMPLETED",
        completionDate: { gte: monthStart, lte: monthEnd }
      }
    }),
    prisma.job.count({ where: { ...tenant, status: "CANCELLED" } }),
    prisma.payment.aggregate({
      where: { ...tenant, paymentStatus: { in: ["PAID", "PARTIAL_PAID"] } },
      _sum: { paidAmount: true }
    }),
    prisma.payment.count({ where: { ...tenant, paymentStatus: "PENDING" } }),
    prisma.payment.count({ where: { ...tenant, paymentStatus: "PAID" } }),
    prisma.payment.count({ where: { ...tenant, paymentStatus: "PARTIAL_PAID" } }),
    prisma.job.findMany({
      where: {
        ...tenant,
        scheduledDate: { gte: todayStart, lte: todayEnd }
      },
      include: {
        customer: true,
        assignedAgent: { select: { id: true, name: true, email: true, role: true } },
        assignedStaff: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { scheduledTime: "asc" }
    }),
    prisma.followUp.findMany({
      where: {
        ...tenant,
        status: "PENDING",
        followUpDate: { lt: todayStart }
      },
      include: {
        customer: true,
        job: true
      },
      orderBy: { followUpDate: "asc" }
    }),
    prisma.callLog.findMany({
      where: tenant,
      take: 8,
      include: {
        customer: true,
        agent: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const system = isSystemAdmin(currentUser)
    ? {
        organizations: await prisma.organization.count(),
        activeOrganizations: await prisma.organization.count({ where: { status: "ACTIVE" } }),
        users: await prisma.user.count()
      }
    : undefined;

  return {
    cards: {
      totalCustomers,
      todaysScheduledJobs,
      pendingFollowUps,
      completedJobsThisMonth,
      cancelledJobs,
      totalRevenue: Number(totalRevenue._sum.paidAmount || 0),
      pendingPayments,
      paidPayments,
      partialPayments
    },
    todaysJobs,
    overdueFollowUps,
    recentCallLogs,
    system
  };
}
