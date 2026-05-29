import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";

const password = await bcrypt.hash("123456", 10);

const users = await Promise.all([
  prisma.user.upsert({
    where: { email: "seed.admin@jobflow.com" },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: { name: "Seed Admin", email: "seed.admin@jobflow.com", password, role: "ADMIN", status: "ACTIVE" }
  }),
  prisma.user.upsert({
    where: { email: "seed.agent1@jobflow.com" },
    update: { role: "AGENT", status: "ACTIVE" },
    create: { name: "Ayesha Agent", email: "seed.agent1@jobflow.com", password, role: "AGENT", status: "ACTIVE" }
  }),
  prisma.user.upsert({
    where: { email: "seed.agent2@jobflow.com" },
    update: { role: "AGENT", status: "ACTIVE" },
    create: { name: "Hamza Agent", email: "seed.agent2@jobflow.com", password, role: "AGENT", status: "ACTIVE" }
  }),
  prisma.user.upsert({
    where: { email: "seed.staff1@jobflow.com" },
    update: { role: "STAFF", status: "ACTIVE" },
    create: { name: "Usman Staff", email: "seed.staff1@jobflow.com", password, role: "STAFF", status: "ACTIVE" }
  }),
  prisma.user.upsert({
    where: { email: "seed.staff2@jobflow.com" },
    update: { role: "STAFF", status: "ACTIVE" },
    create: { name: "Hina Staff", email: "seed.staff2@jobflow.com", password, role: "STAFF", status: "ACTIVE" }
  })
]);

const agents = users.filter((user) => user.role === "AGENT");
const staff = users.filter((user) => user.role === "STAFF");

const customers = [
  ["Green Valley Homes", "0301-1000001", "Gulberg", "Lahore", "Residential"],
  ["Sunrise Foods", "0301-1000002", "DHA", "Karachi", "Commercial"],
  ["Metro Clinic", "0301-1000003", "F-8", "Islamabad", "Commercial"],
  ["Ali Traders", "0301-1000004", "Model Town", "Lahore", "Commercial"],
  ["Bright School", "0301-1000005", "North Nazimabad", "Karachi", "Commercial"],
  ["Omega Pharmacy", "0301-1000006", "Blue Area", "Islamabad", "Commercial"],
  ["Hassan Residence", "0301-1000007", "Johar Town", "Lahore", "Residential"],
  ["City Bakers", "0301-1000008", "Clifton", "Karachi", "Commercial"],
  ["Nexus Office", "0301-1000009", "G-11", "Islamabad", "Commercial"],
  ["Sapphire Villa", "0301-1000010", "Bahria Town", "Lahore", "Residential"],
  ["Crescent Mart", "0301-1000011", "PECHS", "Karachi", "Commercial"],
  ["Capital Gym", "0301-1000012", "I-8", "Islamabad", "Commercial"],
  ["Zain Farmhouse", "0301-1000013", "Bedian", "Lahore", "Residential"],
  ["Harbor Warehouse", "0301-1000014", "Korangi", "Karachi", "Industrial"],
  ["Peak Restaurant", "0301-1000015", "F-7", "Islamabad", "Commercial"],
  ["Mughal Furniture", "0301-1000016", "Township", "Lahore", "Commercial"],
  ["Seaview Apartments", "0301-1000017", "Sea View", "Karachi", "Residential"],
  ["Margalla Guest House", "0301-1000018", "E-11", "Islamabad", "Commercial"],
  ["Liberty Electronics", "0301-1000019", "Liberty", "Lahore", "Commercial"],
  ["Defence Residence", "0301-1000020", "DHA Phase 6", "Karachi", "Residential"]
];

const statuses = ["COMPLETED", "SCHEDULED", "CANCELLED", "RESCHEDULED"];
const callResponses = ["INTERESTED", "CALL_LATER", "NO_ANSWER", "NOT_INTERESTED", "WRONG_NUMBER"];

function dateUtc(year, month, day, hour = 10) {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
}

function addDays(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function timeFor(index) {
  return `${String(9 + (index % 8)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`;
}

const seededCustomers = [];
const seededJobs = [];
const seededFollowUps = [];
const seededCallLogs = [];

for (let index = 0; index < customers.length; index += 1) {
  const [name, phone, area, city, installationType] = customers[index];
  const existingCustomer = await prisma.customer.findFirst({ where: { phone } });
  const customerData = {
    name,
    phone,
    whatsapp: phone,
    email: `seed.customer${index + 1}@example.com`,
    address: `${area}, ${city}`,
    area,
    city,
    jobPaymentAmount: 5000 + (index % 6) * 1500,
    notes: "Seeded customer for JobFlow testing",
    status: index % 6 === 0 ? "INACTIVE" : "ACTIVE"
  };

  const customer = existingCustomer
    ? await prisma.customer.update({ where: { id: existingCustomer.id }, data: customerData })
    : await prisma.customer.create({
        data: {
          ...customerData,
          systems: {
            create: [
              {
                systemType: "Solar",
                systemSize: `${5 + (index % 6) * 2}kW`,
                numberOfPanels: 10 + index,
                installationType,
                notes: "Seeded system detail"
              }
            ]
          }
        }
      });

  seededCustomers.push(customer);

  const jobDates = [
    dateUtc(2025, 12, 3 + (index % 18), 10),
    dateUtc(2026, 2, 2 + (index % 20), 11),
    index % 4 === 0 ? dateUtc(2026, 5, 17, 10 + (index % 5)) : dateUtc(2026, 5, 18 + (index % 10), 12)
  ];

  for (let jobIndex = 0; jobIndex < jobDates.length; jobIndex += 1) {
    const scheduledDate = jobDates[jobIndex];
    const status = jobIndex < 2
      ? (index % 5 === 0 ? "CANCELLED" : "COMPLETED")
      : index % 4 === 0
        ? "SCHEDULED"
        : statuses[index % statuses.length];
    const completionDate = status === "COMPLETED" ? scheduledDate : null;
    const remarks = `Seed job ${jobIndex + 1} for ${phone}`;
    const existingJob = await prisma.job.findFirst({ where: { customerId: customer.id, remarks } });

    const jobData = {
      customerId: customer.id,
      assignedAgentId: agents[index % agents.length].id,
      assignedStaffId: staff[(index + jobIndex) % staff.length].id,
      scheduledDate,
      scheduledTime: timeFor(index + jobIndex),
      status,
      completionDate,
      remarks
    };

    const job = existingJob
      ? await prisma.job.update({ where: { id: existingJob.id }, data: jobData })
      : await prisma.job.create({ data: jobData });

    seededJobs.push(job);

    if (status === "COMPLETED") {
      const followUpDate = addDays(completionDate, 15);
      const existingFollowUp = await prisma.followUp.findFirst({ where: { jobId: job.id } });
      const followUpStatus = index % 4 === 0 ? "DONE" : "PENDING";
      const followUpData = {
        customerId: customer.id,
        jobId: job.id,
        followUpDate,
        status: followUpStatus,
        notes: `${followUpStatus === "PENDING" ? "Pending" : "Done"} seeded follow-up for ${name}`
      };

      const followUp = existingFollowUp
        ? await prisma.followUp.update({ where: { id: existingFollowUp.id }, data: followUpData })
        : await prisma.followUp.create({ data: followUpData });

      seededFollowUps.push(followUp);
    }
  }

  for (let callIndex = 0; callIndex < 2; callIndex += 1) {
    const notes = `Seed call ${callIndex + 1} for ${phone}`;
    const existingCallLog = await prisma.callLog.findFirst({ where: { customerId: customer.id, notes } });
    const callLogData = {
      customerId: customer.id,
      agentId: agents[(index + callIndex) % agents.length].id,
      response: callResponses[(index + callIndex) % callResponses.length],
      notes,
      nextCallDate: callIndex === 0 ? addDays(dateUtc(2026, 5, 17), (index % 7) + 1) : null
    };

    const callLog = existingCallLog
      ? await prisma.callLog.update({ where: { id: existingCallLog.id }, data: callLogData })
      : await prisma.callLog.create({ data: callLogData });

    seededCallLogs.push(callLog);
  }
}

console.log(JSON.stringify({
  customers: seededCustomers.length,
  jobs: seededJobs.length,
  followUps: seededFollowUps.length,
  callLogs: seededCallLogs.length,
  logins: {
    admin: "seed.admin@jobflow.com / 123456",
    agent1: "seed.agent1@jobflow.com / 123456",
    agent2: "seed.agent2@jobflow.com / 123456",
    staff1: "seed.staff1@jobflow.com / 123456",
    staff2: "seed.staff2@jobflow.com / 123456"
  }
}, null, 2));

await prisma.$disconnect();
