import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantData, tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";

const callResponses = ["INTERESTED", "NOT_INTERESTED", "CALL_LATER", "WRONG_NUMBER", "NO_ANSWER"];

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function getPendingFollowUps(currentUser) {
  return prisma.followUp.findMany({
    where: {
      ...tenantWhere(currentUser),
      status: "PENDING",
      followUpDate: {
        lte: endOfToday()
      }
    },
    include: {
      customer: true,
      job: {
        include: {
          assignedAgent: { select: { id: true, name: true, email: true, role: true } },
          assignedStaff: { select: { id: true, name: true, email: true, role: true } }
        }
      },
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      updatedBy: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { followUpDate: "asc" }
  });
}

export async function markFollowUpDone(id, notes, currentUser) {
  const followUp = await prisma.followUp.findFirst({ where: { id, ...tenantWhere(currentUser) } });

  if (!followUp) {
    throw new ApiError(404, "Follow-up not found");
  }

  return prisma.followUp.update({
    where: { id },
    data: {
      status: "DONE",
      updatedById: currentUser?.id,
      notes
    },
    include: {
      customer: true,
      job: true
    }
  });
}

export async function recordFollowUpCall(id, data, currentUser) {
  const { response, notes, nextCallDate, scheduledJobDate } = data;

  if (!response) {
    throw new ApiError(400, "Call response is required");
  }

  validateEnum(response, callResponses, "Call response");

  if (!nextCallDate) {
    throw new ApiError(400, "Next call date is required for follow-up reminders");
  }

  if (response === "INTERESTED" && !scheduledJobDate) {
    throw new ApiError(400, "Scheduled job date is required for interested follow-ups");
  }

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findUniqueOrThrow({
      where: { id },
      include: { customer: true, job: true }
    });

    if (followUp.organizationId !== currentUser.organizationId) {
      throw new ApiError(404, "Follow-up not found");
    }

    const callLog = await tx.callLog.create({
      data: {
        ...tenantData(currentUser),
        customerId: followUp.customerId,
        agentId: currentUser.id,
        response,
        notes,
        createdById: currentUser.id,
        updatedById: currentUser.id,
        nextCallDate: nextCallDate ? new Date(nextCallDate) : undefined
      },
      include: {
        customer: true,
        agent: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    const updatedFollowUp = await tx.followUp.update({
      where: { id },
      data: {
        status: "DONE",
        updatedById: currentUser.id,
        notes: notes || followUp.notes
      },
      include: {
        customer: true,
        job: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    const job = response === "INTERESTED"
      ? await tx.job.create({
          data: {
            ...tenantData(currentUser),
            customerId: followUp.customerId,
            assignedAgentId: ["ADMIN", "AGENT"].includes(currentUser.role) ? currentUser.id : undefined,
            scheduledDate: new Date(scheduledJobDate),
            scheduledTime: "09:00",
            status: "SCHEDULED",
            createdById: currentUser.id,
            updatedById: currentUser.id,
            remarks: `Scheduled from interested follow-up #${followUp.id}`
          },
          include: {
            customer: true,
            assignedAgent: { select: { id: true, name: true, email: true, role: true } },
            assignedStaff: { select: { id: true, name: true, email: true, role: true } }
          }
        })
      : null;

    const nextFollowUp = await tx.followUp.create({
      data: {
        customerId: followUp.customerId,
        ...tenantData(currentUser),
        jobId: job?.id || followUp.jobId,
        followUpDate: new Date(nextCallDate),
        status: "PENDING",
        createdById: currentUser.id,
        updatedById: currentUser.id,
        notes: `Auto-created after ${response} follow-up call`
      },
      include: {
        customer: true,
        job: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        updatedBy: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    return { followUp: updatedFollowUp, callLog, job, nextFollowUp };
  });
}
