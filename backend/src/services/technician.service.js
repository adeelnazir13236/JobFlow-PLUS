import fs from "fs/promises";
import path from "path";
import prisma from "../config/prisma.js";
import { completeJob } from "./job.service.js";
import ApiError from "../utils/ApiError.js";
import { tenantWhere } from "../utils/tenant.js";
import { validateEnum } from "../utils/validation.js";

const assignedStatuses = ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS", "PAUSED"];
const attachmentTypes = ["BEFORE_PHOTO", "AFTER_PHOTO", "GENERAL_ATTACHMENT"];
const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const maxUploadBytes = 5 * 1024 * 1024;
const defaultGpsVerificationRadiusMeters = 100;

const jobSummaryInclude = {
  customer: { select: { id: true, name: true, phone: true, whatsapp: true, address: true, area: true, city: true } },
  assignedStaff: { select: { id: true, name: true, email: true, role: true } },
  contractLinks: {
    include: {
      contract: { select: { id: true, contractNumber: true, title: true, status: true } },
      contractService: { select: { id: true, serviceName: true, totalJobs: true, completedJobs: true } }
    }
  }
};

const jobDetailInclude = {
  ...jobSummaryInclude,
  notes: {
    include: { technician: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  },
  attachments: {
    include: { technician: { select: { id: true, name: true, email: true } } },
    orderBy: { uploadedAt: "desc" }
  },
  signatures: {
    include: { technician: { select: { id: true, name: true, email: true } } },
    orderBy: { signedAt: "desc" }
  },
  completionChecklist: {
    orderBy: { id: "asc" }
  },
  activityLogs: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  },
  locationLogs: {
    include: { technician: { select: { id: true, name: true, email: true } } },
    orderBy: { capturedAt: "desc" }
  }
};

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

function technicianJobWhere(user, extra = {}) {
  const where = { ...tenantWhere(user), ...extra };

  if (user.role === "STAFF") {
    where.assignedStaffId = user.id;
  }

  return where;
}

async function findTechnicianJob(jobId, user, include = jobDetailInclude) {
  const job = await prisma.job.findFirst({
    where: technicianJobWhere(user, { id: jobId }),
    include
  });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  return job;
}

async function logActivity(tx, job, user, activityType, notes) {
  return tx.jobActivityLog.create({
    data: {
      organizationId: job.organizationId,
      jobId: job.id,
      userId: user?.id,
      activityType,
      notes
    }
  });
}

function parseCoordinate(value, field) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new ApiError(400, `${field} is required`);
  }

  return number;
}

function toRadians(value) {
  return value * Math.PI / 180;
}

export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function jobLocation(job) {
  const latitude = job.customer?.latitude;
  const longitude = job.customer?.longitude;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  return { latitude: Number(latitude), longitude: Number(longitude) };
}

function verificationFor(job, latitude, longitude) {
  const location = jobLocation(job);

  if (!location) {
    return {
      distance: null,
      verified: false,
      status: "LOCATION_NOT_AVAILABLE"
    };
  }

  const distance = calculateDistanceInMeters(latitude, longitude, location.latitude, location.longitude);
  const verified = distance <= defaultGpsVerificationRadiusMeters;

  return {
    distance,
    verified,
    status: verified ? "VERIFIED" : "OUT_OF_RANGE"
  };
}

function jobDateRangeFilter(query) {
  if (!query.date) {
    return {};
  }

  const date = new Date(query.date);
  return { scheduledDate: { gte: startOfDay(date), lte: endOfDay(date) } };
}

export async function getTechnicianDashboard(user) {
  const todayRange = { scheduledDate: { gte: startOfDay(), lte: endOfDay() } };
  const baseWhere = technicianJobWhere(user);
  const todayWhere = technicianJobWhere(user, todayRange);

  const [todaysJobs, upcomingJobs, completedToday, pendingJobs, recentActivity] = await Promise.all([
    prisma.job.findMany({
      where: todayWhere,
      include: jobSummaryInclude,
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }]
    }),
    prisma.job.findMany({
      where: technicianJobWhere(user, { scheduledDate: { gt: endOfDay() }, status: { in: assignedStatuses } }),
      include: jobSummaryInclude,
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      take: 8
    }),
    prisma.job.count({
      where: technicianJobWhere(user, { status: "COMPLETED", completionDate: { gte: startOfDay(), lte: endOfDay() } })
    }),
    prisma.job.count({
      where: { ...baseWhere, status: { in: assignedStatuses } }
    }),
    prisma.jobActivityLog.findMany({
      where: tenantWhere(user),
      include: {
        job: { include: { customer: { select: { id: true, name: true } } } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return {
    cards: {
      todaysJobs: todaysJobs.length,
      pendingJobs,
      completedToday,
      upcomingJobs: upcomingJobs.length
    },
    todaysJobs,
    upcomingJobs,
    recentActivity
  };
}

export async function getTechnicianJobs(user, query = {}) {
  validateEnum(query.status, ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"], "Status");

  const where = technicianJobWhere(user, {
    ...jobDateRangeFilter(query),
    status: query.status || undefined
  });

  if (query.view === "today") {
    Object.assign(where, { scheduledDate: { gte: startOfDay(), lte: endOfDay() } });
  }

  if (query.view === "upcoming") {
    Object.assign(where, { scheduledDate: { gt: endOfDay() }, status: { in: assignedStatuses } });
  }

  if (query.view === "completed") {
    Object.assign(where, { status: "COMPLETED" });
  }

  return prisma.job.findMany({
    where,
    include: jobSummaryInclude,
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }]
  });
}

export async function getTechnicianJob(jobId, user) {
  const job = await findTechnicianJob(jobId, user);

  await prisma.jobActivityLog.create({
    data: {
      organizationId: job.organizationId,
      jobId: job.id,
      userId: user.id,
      activityType: "VIEWED",
      notes: "Job detail viewed"
    }
  });

  return findTechnicianJob(jobId, user);
}

export async function startTechnicianJob(jobId, user) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (!["SCHEDULED", "RESCHEDULED"].includes(job.status)) {
      throw new ApiError(400, "Only scheduled jobs can be started");
    }

    const updated = await tx.job.update({
      where: { id: job.id },
      data: { status: "IN_PROGRESS", updatedById: user.id }
    });

    await logActivity(tx, updated, user, "STARTED", "Job started by technician");
    return tx.job.findUnique({ where: { id: job.id }, include: jobDetailInclude });
  });
}

export async function pauseTechnicianJob(jobId, user, notes) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.status !== "IN_PROGRESS") {
      throw new ApiError(400, "Only in-progress jobs can be paused");
    }

    const updated = await tx.job.update({
      where: { id: job.id },
      data: { status: "PAUSED", updatedById: user.id }
    });

    await logActivity(tx, updated, user, "PAUSED", notes || "Job paused by technician");
    return tx.job.findUnique({ where: { id: job.id }, include: jobDetailInclude });
  });
}

export async function resumeTechnicianJob(jobId, user) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.status !== "PAUSED") {
      throw new ApiError(400, "Only paused jobs can be resumed");
    }

    const updated = await tx.job.update({
      where: { id: job.id },
      data: { status: "IN_PROGRESS", updatedById: user.id }
    });

    await logActivity(tx, updated, user, "RESUMED", "Job resumed by technician");
    return tx.job.findUnique({ where: { id: job.id }, include: jobDetailInclude });
  });
}

export async function completeTechnicianJob(jobId, user, remarks) {
  const job = await prisma.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  if (job.status !== "IN_PROGRESS") {
    throw new ApiError(400, "Only in-progress jobs can be completed");
  }

  const completed = await completeJob(job.id, remarks, user);
  await prisma.jobActivityLog.create({
    data: {
      organizationId: completed.organizationId,
      jobId: completed.id,
      userId: user.id,
      activityType: "COMPLETED",
      notes: remarks || "Job completed by technician"
    }
  });

  return findTechnicianJob(job.id, user);
}

export async function checkInTechnicianJob(jobId, user, data = {}) {
  const latitude = parseCoordinate(data.latitude, "Latitude");
  const longitude = parseCoordinate(data.longitude, "Longitude");
  const accuracy = data.accuracy !== undefined && data.accuracy !== null ? Number(data.accuracy) : null;

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: technicianJobWhere(user, { id: jobId }),
      include: { customer: true }
    });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (["COMPLETED", "CANCELLED"].includes(job.status)) {
      throw new ApiError(400, "Cannot check in to a completed or cancelled job");
    }

    if (job.checkedInAt) {
      throw new ApiError(400, "Job is already checked in");
    }

    const verification = verificationFor(job, latitude, longitude);
    const capturedAt = new Date();

    const locationLog = await tx.jobLocationLog.create({
      data: {
        organizationId: job.organizationId,
        jobId: job.id,
        technicianId: user.id,
        eventType: "CHECK_IN",
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        distanceFromJobLocation: verification.distance,
        isVerified: verification.verified,
        capturedAt,
        notes: data.notes
      },
      include: { technician: { select: { id: true, name: true, email: true } } }
    });

    await tx.job.update({
      where: { id: job.id },
      data: {
        checkedInAt: capturedAt,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        locationVerified: verification.verified,
        locationVerificationStatus: verification.status,
        updatedById: user.id
      }
    });

    await logActivity(tx, job, user, "CHECKED_IN", verification.status === "VERIFIED" ? "GPS check-in verified" : `GPS check-in ${verification.status.toLowerCase().replaceAll("_", " ")}`);

    return {
      job: await tx.job.findUnique({ where: { id: job.id }, include: jobDetailInclude }),
      locationLog
    };
  });
}

export async function checkOutTechnicianJob(jobId, user, data = {}) {
  const latitude = parseCoordinate(data.latitude, "Latitude");
  const longitude = parseCoordinate(data.longitude, "Longitude");
  const accuracy = data.accuracy !== undefined && data.accuracy !== null ? Number(data.accuracy) : null;

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: technicianJobWhere(user, { id: jobId }),
      include: { customer: true }
    });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (!job.checkedInAt) {
      throw new ApiError(400, "Check-in is required before check-out");
    }

    if (job.checkedOutAt) {
      throw new ApiError(400, "Job is already checked out");
    }

    if (job.status === "CANCELLED") {
      throw new ApiError(400, "Cannot check out from a cancelled job");
    }

    const verification = verificationFor(job, latitude, longitude);
    const capturedAt = new Date();
    const locationLog = await tx.jobLocationLog.create({
      data: {
        organizationId: job.organizationId,
        jobId: job.id,
        technicianId: user.id,
        eventType: "CHECK_OUT",
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        distanceFromJobLocation: verification.distance,
        isVerified: verification.verified,
        capturedAt,
        notes: data.notes
      },
      include: { technician: { select: { id: true, name: true, email: true } } }
    });

    await tx.job.update({
      where: { id: job.id },
      data: {
        checkedOutAt: capturedAt,
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        locationVerified: job.locationVerified && verification.verified,
        locationVerificationStatus: job.locationVerificationStatus === "VERIFIED" && verification.verified
          ? "VERIFIED"
          : verification.status,
        updatedById: user.id
      }
    });

    await logActivity(tx, job, user, "CHECKED_OUT", verification.status === "VERIFIED" ? "GPS check-out verified" : `GPS check-out ${verification.status.toLowerCase().replaceAll("_", " ")}`);

    return {
      job: await tx.job.findUnique({ where: { id: job.id }, include: jobDetailInclude }),
      locationLog
    };
  });
}

export async function addJobNote(jobId, user, note) {
  if (!note?.trim()) {
    throw new ApiError(400, "Note is required");
  }

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const created = await tx.jobNote.create({
      data: {
        organizationId: job.organizationId,
        jobId: job.id,
        technicianId: user.id,
        note: note.trim()
      },
      include: { technician: { select: { id: true, name: true, email: true } } }
    });

    await logActivity(tx, job, user, "NOTE_ADDED", "Technician note added");
    return created;
  });
}

export async function updateJobNote(jobId, noteId, user, note) {
  if (!note?.trim()) {
    throw new ApiError(400, "Note is required");
  }

  const existing = await prisma.jobNote.findFirst({
    where: {
      id: noteId,
      jobId,
      organizationId: user.organizationId,
      technicianId: user.id
    }
  });

  if (!existing) {
    throw new ApiError(404, "Note not found");
  }

  return prisma.jobNote.update({
    where: { id: noteId },
    data: { note: note.trim() },
    include: { technician: { select: { id: true, name: true, email: true } } }
  });
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");

  if (!match) {
    throw new ApiError(400, "A valid base64 file is required");
  }

  const [, mimeType, base64] = match;
  const extension = imageTypes.get(mimeType);

  if (!extension) {
    throw new ApiError(400, "Only JPG, PNG, and WEBP images are allowed");
  }

  const buffer = Buffer.from(base64, "base64");

  if (buffer.length > maxUploadBytes) {
    throw new ApiError(400, "File size must be 5MB or less");
  }

  return { buffer, extension };
}

async function saveJobFile(job, dataUrl, prefix) {
  const { buffer, extension } = parseDataUrl(dataUrl);
  const directory = path.resolve("uploads", "technician", String(job.organizationId), String(job.id));
  await fs.mkdir(directory, { recursive: true });
  const fileName = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`;
  const fullPath = path.join(directory, fileName);
  await fs.writeFile(fullPath, buffer);
  return {
    fileName,
    filePath: `/uploads/technician/${job.organizationId}/${job.id}/${fileName}`
  };
}

export async function addJobAttachment(jobId, user, data) {
  validateEnum(data.attachmentType, attachmentTypes, "Attachment type");

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const savedFile = await saveJobFile(job, data.fileData, "attachment");
    const attachment = await tx.jobAttachment.create({
      data: {
        organizationId: job.organizationId,
        jobId: job.id,
        technicianId: user.id,
        fileName: data.fileName || savedFile.fileName,
        filePath: savedFile.filePath,
        attachmentType: data.attachmentType
      },
      include: { technician: { select: { id: true, name: true, email: true } } }
    });

    await logActivity(tx, job, user, "PHOTO_UPLOADED", `${data.attachmentType} uploaded`);
    return attachment;
  });
}

export async function saveJobSignature(jobId, user, data) {
  if (!data.signedByName?.trim()) {
    throw new ApiError(400, "Signed by name is required");
  }

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const savedFile = await saveJobFile(job, data.signatureData, "signature");
    const signature = await tx.jobSignature.create({
      data: {
        organizationId: job.organizationId,
        jobId: job.id,
        technicianId: user.id,
        signatureImagePath: savedFile.filePath,
        signedByName: data.signedByName.trim()
      },
      include: { technician: { select: { id: true, name: true, email: true } } }
    });

    await logActivity(tx, job, user, "SIGNATURE_CAPTURED", `Signature captured from ${signature.signedByName}`);
    return signature;
  });
}

export async function updateChecklistItem(jobId, itemId, user, completed) {
  const item = await prisma.jobCompletionChecklist.findFirst({
    where: { id: itemId, jobId, organizationId: user.organizationId }
  });

  if (!item) {
    throw new ApiError(404, "Checklist item not found");
  }

  const job = await prisma.job.findFirst({ where: technicianJobWhere(user, { id: jobId }) });

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  return prisma.jobCompletionChecklist.update({
    where: { id: itemId },
    data: {
      completed: Boolean(completed),
      completedAt: completed ? new Date() : null
    }
  });
}

export async function getTechnicianProfile(user) {
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, status: true } },
      organization: { select: { id: true, name: true, status: true, plan: true } }
    }
  });

  return profile || {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    organization: user.organization,
    employeeCode: null,
    phone: null,
    designation: "Technician",
    active: true
  };
}
