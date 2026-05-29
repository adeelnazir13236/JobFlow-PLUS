import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";

const password = await bcrypt.hash("123456", 10);

async function upsertOrganization(data) {
  const existing = await prisma.organization.findFirst({ where: { name: data.name } });

  if (existing) {
    return prisma.organization.update({ where: { id: existing.id }, data });
  }

  return prisma.organization.create({ data });
}

async function upsertUser(organizationId, data) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: { ...data, password, organizationId },
    create: { ...data, password, organizationId }
  });
}

function dateUtc(year, month, day, hour = 10) {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
}

function addDays(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

const systemAdmin = await prisma.user.upsert({
  where: { email: "system.admin@jobflowplus.com" },
  update: { name: "System Admin", password, role: "SYSTEM_ADMIN", status: "ACTIVE", organizationId: null },
  create: { name: "System Admin", email: "system.admin@jobflowplus.com", password, role: "SYSTEM_ADMIN", status: "ACTIVE" }
});

const organizations = [
  await upsertOrganization({
    name: "Sample Cleaning Company",
    email: "admin@sample-cleaning.test",
    phone: "0300-1000001",
    address: "Lahore",
    status: "ACTIVE",
    plan: "PLUS"
  }),
  await upsertOrganization({
    name: "Sample Maintenance Company",
    email: "admin@sample-maintenance.test",
    phone: "0300-2000001",
    address: "Karachi",
    status: "ACTIVE",
    plan: "PLUS"
  })
];

const organizationSeeds = [
  {
    organization: organizations[0],
    users: [
      { name: "Cleaning Admin", email: "admin@sample-cleaning.test", role: "ADMIN", status: "ACTIVE" },
      { name: "Cleaning Agent", email: "agent@sample-cleaning.test", role: "AGENT", status: "ACTIVE" },
      { name: "Cleaning Staff", email: "staff@sample-cleaning.test", role: "STAFF", status: "ACTIVE" }
    ],
    customers: [
      { name: "Green Villa", phone: "0301-1100001", city: "Lahore", area: "DHA", systemType: "Deep Cleaning", jobPaymentAmount: 12000 },
      { name: "Bright Office", phone: "0301-1100002", city: "Lahore", area: "Gulberg", systemType: "Office Cleaning", jobPaymentAmount: 18000 }
    ]
  },
  {
    organization: organizations[1],
    users: [
      { name: "Maintenance Admin", email: "admin@sample-maintenance.test", role: "ADMIN", status: "ACTIVE" },
      { name: "Maintenance Agent", email: "agent@sample-maintenance.test", role: "AGENT", status: "ACTIVE" },
      { name: "Maintenance Staff", email: "staff@sample-maintenance.test", role: "STAFF", status: "ACTIVE" }
    ],
    customers: [
      { name: "Metro Clinic", phone: "0301-2200001", city: "Karachi", area: "Clifton", systemType: "AC Maintenance", jobPaymentAmount: 9000 },
      { name: "Harbor Warehouse", phone: "0301-2200002", city: "Karachi", area: "Korangi", systemType: "Electrical Maintenance", jobPaymentAmount: 22000 }
    ]
  }
];

const summary = { organizations: organizations.length, users: 1, customers: 0, jobs: 0, followUps: 0, callLogs: 0 };

for (const seed of organizationSeeds) {
  const users = await Promise.all(seed.users.map((user) => upsertUser(seed.organization.id, user)));
  summary.users += users.length;
  const admin = users.find((user) => user.role === "ADMIN");
  const agent = users.find((user) => user.role === "AGENT");
  const staff = users.find((user) => user.role === "STAFF");

  for (let index = 0; index < seed.customers.length; index += 1) {
    const customerSeed = seed.customers[index];
    const existingCustomer = await prisma.customer.findFirst({
      where: { organizationId: seed.organization.id, phone: customerSeed.phone }
    });

    const customerData = {
      organizationId: seed.organization.id,
      name: customerSeed.name,
      phone: customerSeed.phone,
      whatsapp: customerSeed.phone,
      email: `customer${index + 1}@${seed.organization.name.toLowerCase().replaceAll(" ", "-")}.test`,
      address: `${customerSeed.area}, ${customerSeed.city}`,
      area: customerSeed.area,
      city: customerSeed.city,
      jobPaymentAmount: customerSeed.jobPaymentAmount,
      notes: `Seeded for ${seed.organization.name}`,
      status: "ACTIVE",
      createdById: admin.id,
      updatedById: admin.id
    };

    const customer = existingCustomer
      ? await prisma.customer.update({ where: { id: existingCustomer.id }, data: customerData })
      : await prisma.customer.create({
          data: {
            ...customerData,
            systems: {
              create: [{
                organizationId: seed.organization.id,
                systemType: customerSeed.systemType,
                notes: `Seeded system for ${seed.organization.name}`
              }]
            }
          }
        });

    summary.customers += 1;

    const scheduledDate = dateUtc(2026, 6, 1 + index, 10 + index);
    const existingJob = await prisma.job.findFirst({
      where: { organizationId: seed.organization.id, customerId: customer.id, remarks: `Seed job for ${customer.name}` }
    });
    const jobData = {
      organizationId: seed.organization.id,
      customerId: customer.id,
      assignedAgentId: agent.id,
      assignedStaffId: staff.id,
      scheduledDate,
      scheduledTime: index === 0 ? "10:00" : "14:00",
      status: index === 0 ? "SCHEDULED" : "COMPLETED",
      completionDate: index === 0 ? null : scheduledDate,
      remarks: `Seed job for ${customer.name}`,
      createdById: admin.id,
      updatedById: admin.id,
      completedById: index === 0 ? null : staff.id
    };

    const job = existingJob
      ? await prisma.job.update({ where: { id: existingJob.id }, data: jobData })
      : await prisma.job.create({ data: jobData });

    summary.jobs += 1;

    const followUpDate = addDays(scheduledDate, index === 0 ? 2 : 15);
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { organizationId: seed.organization.id, customerId: customer.id, jobId: job.id }
    });
    const followUpData = {
      organizationId: seed.organization.id,
      customerId: customer.id,
      jobId: job.id,
      followUpDate,
      status: "PENDING",
      notes: `Tenant-specific follow-up for ${customer.name}`,
      createdById: admin.id,
      updatedById: admin.id
    };

    existingFollowUp
      ? await prisma.followUp.update({ where: { id: existingFollowUp.id }, data: followUpData })
      : await prisma.followUp.create({ data: followUpData });

    summary.followUps += 1;

    const callNotes = `Tenant-specific call for ${customer.name}`;
    const existingCallLog = await prisma.callLog.findFirst({
      where: { organizationId: seed.organization.id, customerId: customer.id, notes: callNotes }
    });
    const callLogData = {
      organizationId: seed.organization.id,
      customerId: customer.id,
      agentId: agent.id,
      response: index === 0 ? "INTERESTED" : "CALL_LATER",
      notes: callNotes,
      nextCallDate: addDays(new Date(), 3 + index),
      createdById: agent.id,
      updatedById: agent.id
    };

    existingCallLog
      ? await prisma.callLog.update({ where: { id: existingCallLog.id }, data: callLogData })
      : await prisma.callLog.create({ data: callLogData });

    summary.callLogs += 1;
  }
}

console.log(JSON.stringify({
  ...summary,
  logins: {
    systemAdmin: `${systemAdmin.email} / 123456`,
    cleaningAdmin: "admin@sample-cleaning.test / 123456",
    cleaningAgent: "agent@sample-cleaning.test / 123456",
    maintenanceAdmin: "admin@sample-maintenance.test / 123456",
    maintenanceAgent: "agent@sample-maintenance.test / 123456"
  }
}, null, 2));

await prisma.$disconnect();
