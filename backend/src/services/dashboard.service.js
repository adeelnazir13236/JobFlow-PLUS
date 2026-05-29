import prisma from "../config/prisma.js";

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

export async function getDashboardSummary() {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

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
    prisma.customer.count(),
    prisma.job.count({
      where: {
        status: "SCHEDULED",
        scheduledDate: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.followUp.count({
      where: {
        status: "PENDING",
        followUpDate: { lte: todayEnd }
      }
    }),
    prisma.job.count({
      where: {
        status: "COMPLETED",
        completionDate: { gte: monthStart, lte: monthEnd }
      }
    }),
    prisma.job.count({ where: { status: "CANCELLED" } }),
    prisma.payment.aggregate({
      where: { paymentStatus: { in: ["PAID", "PARTIAL_PAID"] } },
      _sum: { paidAmount: true }
    }),
    prisma.payment.count({ where: { paymentStatus: "PENDING" } }),
    prisma.payment.count({ where: { paymentStatus: "PAID" } }),
    prisma.payment.count({ where: { paymentStatus: "PARTIAL_PAID" } }),
    prisma.job.findMany({
      where: {
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
      take: 8,
      include: {
        customer: true,
        agent: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

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
    recentCallLogs
  };
}
