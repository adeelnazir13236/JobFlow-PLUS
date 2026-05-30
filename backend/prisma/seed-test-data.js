import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";

const password = await bcrypt.hash("123456", 10);

const featureSeeds = [
  ["CUSTOMERS", "Customers", "Customer profiles and records", "Operations"],
  ["JOBS", "Jobs", "Job scheduling and management", "Operations"],
  ["FOLLOW_UPS", "Follow-ups", "Follow-up reminders and actions", "Operations"],
  ["CALL_LOGS", "Call Logs", "Call history and responses", "Operations"],
  ["DASHBOARD", "Dashboard", "Operational dashboards", "Overview"],
  ["REPORTS", "Reports", "Reports and analytics", "Analytics"],
  ["CONTRACTS", "Contracts", "AMC and contract records", "Premium"],
  ["RECURRING_JOBS", "Recurring Jobs", "Recurring schedules", "Premium"],
  ["QUOTATIONS", "Quotations", "Sales quotations", "Finance"],
  ["INVOICES", "Invoices", "Invoice management", "Finance"],
  ["PAYMENTS", "Payments", "Payment tracking", "Finance"],
  ["WHATSAPP", "WhatsApp", "WhatsApp messaging", "Integrations"],
  ["CUSTOMER_PORTAL", "Customer Portal", "Customer self-service portal", "Portal"],
  ["AI_ASSISTANT", "AI Assistant", "AI-powered assistance", "AI"]
];

const planSeeds = [
  {
    name: "Starter",
    code: "STARTER",
    description: "Essential field operations for small teams.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS"]
  },
  {
    name: "Professional",
    code: "PROFESSIONAL",
    description: "Advanced operations, finance, and recurring work.",
    monthlyPrice: 49,
    yearlyPrice: 499,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS", "REPORTS", "CONTRACTS", "RECURRING_JOBS", "QUOTATIONS", "INVOICES", "PAYMENTS"]
  },
  {
    name: "Enterprise",
    code: "ENTERPRISE",
    description: "Full platform access with integrations, portal, and AI.",
    monthlyPrice: 149,
    yearlyPrice: 1499,
    features: featureSeeds.map(([code]) => code)
  }
];

function startOfDay(offsetDays = 0, hour = 10) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function addDays(date, days, hour = date.getHours()) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value;
}

function slug(value) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function invoiceNumberForJob(jobId) {
  return `SEED-INV-${String(jobId).padStart(6, "0")}`;
}

function contractInvoiceNumber(contractId, completedJobs) {
  return `SEED-CINV-${String(contractId).padStart(4, "0")}-${completedJobs}`;
}

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

async function seedPlansAndFeatures() {
  const featuresByCode = {};
  for (const [code, name, description, moduleGroup] of featureSeeds) {
    featuresByCode[code] = await prisma.feature.upsert({
      where: { code },
      update: { name, description, moduleGroup, status: "ACTIVE" },
      create: { code, name, description, moduleGroup, status: "ACTIVE" }
    });
  }

  const plansByCode = {};
  for (const seed of planSeeds) {
    const plan = await prisma.plan.upsert({
      where: { code: seed.code },
      update: { name: seed.name, description: seed.description, monthlyPrice: seed.monthlyPrice, yearlyPrice: seed.yearlyPrice, status: "ACTIVE" },
      create: { name: seed.name, code: seed.code, description: seed.description, monthlyPrice: seed.monthlyPrice, yearlyPrice: seed.yearlyPrice, status: "ACTIVE" }
    });
    plansByCode[plan.code] = plan;
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
    await prisma.planFeature.createMany({
      data: seed.features.map((code) => ({ planId: plan.id, featureId: featuresByCode[code].id })),
      skipDuplicates: true
    });
  }

  return { featuresByCode, plansByCode };
}

async function assignSubscription(organization, plan) {
  await prisma.organizationSubscription.updateMany({
    where: { organizationId: organization.id, status: "ACTIVE" },
    data: { status: "INACTIVE" }
  });
  await prisma.organizationSubscription.create({
    data: { organizationId: organization.id, planId: plan.id, status: "ACTIVE", billingCycle: "MONTHLY", startDate: new Date() }
  });
  await prisma.organization.update({ where: { id: organization.id }, data: { plan: plan.code } });
}

async function upsertCustomer(organization, admin, customerSeed, index) {
  const customerData = {
    organizationId: organization.id,
    name: customerSeed.name,
    phone: customerSeed.phone,
    whatsapp: customerSeed.phone,
    email: `${slug(customerSeed.name)}@${slug(organization.name)}.test`,
    address: `${customerSeed.area}, ${customerSeed.city}`,
    area: customerSeed.area,
    city: customerSeed.city,
    jobPaymentAmount: customerSeed.jobPaymentAmount,
    notes: `Seeded customer ${index + 1} for ${organization.name}`,
    status: customerSeed.status || "ACTIVE",
    createdById: admin.id,
    updatedById: admin.id
  };

  const existingCustomer = await prisma.customer.findFirst({
    where: { organizationId: organization.id, phone: customerSeed.phone }
  });

  const customer = existingCustomer
    ? await prisma.customer.update({ where: { id: existingCustomer.id }, data: customerData })
    : await prisma.customer.create({
        data: {
          ...customerData,
          systems: {
            create: [{
              organizationId: organization.id,
              systemType: customerSeed.systemType,
              systemSize: customerSeed.systemSize,
              numberOfPanels: customerSeed.numberOfPanels,
              installationType: customerSeed.installationType,
              notes: `Seeded system for ${organization.name}`
            }]
          }
        }
      });

  if (existingCustomer) {
    await prisma.customerSystem.deleteMany({ where: { organizationId: organization.id, customerId: customer.id } });
    await prisma.customerSystem.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        systemType: customerSeed.systemType,
        systemSize: customerSeed.systemSize,
        numberOfPanels: customerSeed.numberOfPanels,
        installationType: customerSeed.installationType,
        notes: `Seeded system for ${organization.name}`
      }
    });
  }

  return customer;
}

async function upsertJob(organization, customer, admin, agent, staff, jobSeed) {
  const existingJob = await prisma.job.findFirst({
    where: {
      organizationId: organization.id,
      customerId: customer.id,
      remarks: jobSeed.remarks
    }
  });

  const jobData = {
    organizationId: organization.id,
    customerId: customer.id,
    assignedAgentId: agent.id,
    assignedStaffId: staff.id,
    scheduledDate: jobSeed.scheduledDate,
    scheduledTime: jobSeed.scheduledTime,
    status: jobSeed.status,
    completionDate: jobSeed.status === "COMPLETED" ? jobSeed.completionDate || jobSeed.scheduledDate : null,
    remarks: jobSeed.remarks,
    createdById: admin.id,
    updatedById: admin.id,
    completedById: jobSeed.status === "COMPLETED" ? staff.id : null
  };

  return existingJob
    ? prisma.job.update({ where: { id: existingJob.id }, data: jobData })
    : prisma.job.create({ data: jobData });
}

async function upsertFollowUp(organization, customer, job, admin, followUpSeed) {
  const existingFollowUp = await prisma.followUp.findFirst({
    where: {
      organizationId: organization.id,
      customerId: customer.id,
      jobId: job.id,
      notes: followUpSeed.notes
    }
  });

  const followUpData = {
    organizationId: organization.id,
    customerId: customer.id,
    jobId: job.id,
    followUpDate: followUpSeed.followUpDate,
    status: followUpSeed.status,
    notes: followUpSeed.notes,
    createdById: admin.id,
    updatedById: admin.id
  };

  return existingFollowUp
    ? prisma.followUp.update({ where: { id: existingFollowUp.id }, data: followUpData })
    : prisma.followUp.create({ data: followUpData });
}

async function upsertCallLog(organization, customer, agent, callSeed) {
  const existingCallLog = await prisma.callLog.findFirst({
    where: {
      organizationId: organization.id,
      customerId: customer.id,
      notes: callSeed.notes
    }
  });

  const callLogData = {
    organizationId: organization.id,
    customerId: customer.id,
    agentId: agent.id,
    response: callSeed.response,
    notes: callSeed.notes,
    nextCallDate: callSeed.nextCallDate,
    createdById: agent.id,
    updatedById: agent.id
  };

  return existingCallLog
    ? prisma.callLog.update({ where: { id: existingCallLog.id }, data: callLogData })
    : prisma.callLog.create({ data: callLogData });
}

async function upsertPayment(organization, customer, job, admin, paymentSeed) {
  if (job.status !== "COMPLETED") {
    return null;
  }

  const totalAmount = Number(paymentSeed.totalAmount);
  const paidAmount = Number(paymentSeed.paidAmount);

  return prisma.payment.upsert({
    where: { jobId: job.id },
    update: {
      organizationId: organization.id,
      customerId: customer.id,
      totalAmount,
      paidAmount,
      balanceAmount: Math.max(totalAmount - paidAmount, 0),
      paymentMethod: paymentSeed.paymentMethod,
      paymentStatus: paymentSeed.paymentStatus,
      paymentDate: paymentSeed.paymentDate,
      remarks: paymentSeed.remarks,
      updatedById: admin.id
    },
    create: {
      organizationId: organization.id,
      invoiceNumber: invoiceNumberForJob(job.id),
      customerId: customer.id,
      jobId: job.id,
      totalAmount,
      paidAmount,
      balanceAmount: Math.max(totalAmount - paidAmount, 0),
      paymentMethod: paymentSeed.paymentMethod,
      paymentStatus: paymentSeed.paymentStatus,
      paymentDate: paymentSeed.paymentDate,
      remarks: paymentSeed.remarks,
      createdById: admin.id,
      updatedById: admin.id
    }
  });
}

async function seedContractExample(organization, customer, admin, staff, contractSeed) {
  const contract = await prisma.contract.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      contractNumber: contractSeed.contractNumber,
      title: contractSeed.title,
      description: contractSeed.description,
      startDate: contractSeed.startDate,
      endDate: contractSeed.endDate,
      contractValue: contractSeed.contractValue,
      status: "ACTIVE",
      createdByUserId: admin.id
    }
  });

  const service = await prisma.contractService.create({
    data: {
      organizationId: organization.id,
      contractId: contract.id,
      serviceName: contractSeed.serviceName,
      description: contractSeed.serviceDescription,
      frequencyType: contractSeed.frequencyType || "MONTHLY",
      frequencyInterval: contractSeed.frequencyInterval || 1,
      totalJobs: contractSeed.totalJobs,
      completedJobs: contractSeed.completedJobs,
      nextJobDate: contractSeed.nextJobDate,
      preferredTime: "09:00",
      assignedUserId: staff.id,
      generateNextOnCompletion: true,
      status: "ACTIVE"
    }
  });

  const job = await prisma.job.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      assignedStaffId: staff.id,
      scheduledDate: contractSeed.nextJobDate,
      scheduledTime: "09:00",
      status: "SCHEDULED",
      remarks: `Contract ${contract.contractNumber} - ${service.serviceName} #${contractSeed.nextSequence}`,
      createdById: admin.id,
      updatedById: admin.id
    }
  });

  await prisma.contractJobLink.create({
    data: {
      organizationId: organization.id,
      contractId: contract.id,
      contractServiceId: service.id,
      jobId: job.id,
      jobSequenceNumber: contractSeed.nextSequence
    }
  });

  const billingRule = await prisma.contractBillingRule.create({
    data: {
      organizationId: organization.id,
      contractId: contract.id,
      billingType: "MONTHLY",
      billingCycle: "MONTHLY",
      invoiceAfterCompletedJobs: contractSeed.invoiceAfterCompletedJobs,
      invoiceAmount: contractSeed.invoiceAmount,
      lastInvoicedCompletedJobCount: contractSeed.completedJobs,
      nextInvoiceDueAfterJobs: contractSeed.completedJobs + contractSeed.invoiceAfterCompletedJobs,
      status: "ACTIVE"
    }
  });

  if (contractSeed.completedJobs > 0) {
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        contractId: contract.id,
        billingRuleId: billingRule.id,
        invoiceNumber: contractInvoiceNumber(contract.id, contractSeed.completedJobs),
        invoiceDate: addDays(new Date(), -1, 10),
        dueDate: addDays(new Date(), 14, 10),
        amount: contractSeed.invoiceAmount,
        paidAmount: contractSeed.seedPaymentAmount || 0,
        balanceAmount: Math.max(Number(contractSeed.invoiceAmount) - Number(contractSeed.seedPaymentAmount || 0), 0),
        status: contractSeed.seedPaymentAmount >= contractSeed.invoiceAmount ? "PAID" : contractSeed.seedPaymentAmount > 0 ? "PARTIALLY_PAID" : "GENERATED",
        paymentStatus: contractSeed.seedPaymentAmount >= contractSeed.invoiceAmount ? "PAID" : contractSeed.seedPaymentAmount > 0 ? "PARTIALLY_PAID" : "GENERATED",
        notes: `Seed invoice after ${contractSeed.completedJobs} completed contract jobs`
      }
    });

    if (contractSeed.seedPaymentAmount > 0) {
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          customerId: customer.id,
          invoiceId: invoice.id,
          contractId: contract.id,
          invoiceNumber: `SEED-PAY-${invoice.id}`,
          paymentNumber: `SEED-PAY-${invoice.id}`,
          totalAmount: invoice.amount,
          amount: contractSeed.seedPaymentAmount,
          paidAmount: contractSeed.seedPaymentAmount,
          balanceAmount: Math.max(Number(invoice.amount) - Number(contractSeed.seedPaymentAmount), 0),
          paymentMethod: contractSeed.seedPaymentMethod || "BANK_TRANSFER",
          paymentStatus: contractSeed.seedPaymentAmount >= contractSeed.invoiceAmount ? "PAID" : "PARTIALLY_PAID",
          paymentDate: new Date(),
          referenceNumber: contractSeed.seedPaymentReference || null,
          notes: contractSeed.seedPaymentNotes || "Seed invoice payment",
          remarks: contractSeed.seedPaymentNotes || "Seed invoice payment",
          receivedById: admin.id,
          createdById: admin.id,
          updatedById: admin.id
        }
      });
    }
  }

  if (contractSeed.extraUnpaidInvoice) {
    await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        contractId: contract.id,
        billingRuleId: billingRule.id,
        invoiceNumber: `SEED-CINV-${String(contract.id).padStart(4, "0")}-UNPAID`,
        invoiceDate: new Date(),
        dueDate: addDays(new Date(), 15, 10),
        amount: contractSeed.invoiceAmount,
        paidAmount: 0,
        balanceAmount: contractSeed.invoiceAmount,
        status: "GENERATED",
        paymentStatus: "GENERATED",
        notes: "Seed unpaid invoice for payment testing"
      }
    });
  }

  return { contract, job };
}

const systemAdmin = await prisma.user.upsert({
  where: { email: "system.admin@jobflowplus.com" },
  update: { name: "System Admin", password, role: "SYSTEM_ADMIN", status: "ACTIVE", organizationId: null },
  create: { name: "System Admin", email: "system.admin@jobflowplus.com", password, role: "SYSTEM_ADMIN", status: "ACTIVE" }
});

const { featuresByCode, plansByCode } = await seedPlansAndFeatures();

const organizationSeeds = [
  {
    organization: {
      name: "Sample Cleaning Company",
      email: "admin@sample-cleaning.test",
      phone: "0300-1000001",
      address: "Lahore",
      status: "ACTIVE",
      plan: "STARTER"
    },
    subscriptionPlan: "STARTER",
    overrides: ["WHATSAPP"],
    users: [
      { name: "Cleaning Admin", email: "admin@sample-cleaning.test", role: "ADMIN", status: "ACTIVE" },
      { name: "Cleaning Agent", email: "agent@sample-cleaning.test", role: "AGENT", status: "ACTIVE" },
      { name: "Cleaning Staff", email: "staff@sample-cleaning.test", role: "STAFF", status: "ACTIVE" }
    ],
    customers: [
      { name: "Green Villa", phone: "0301-1100001", city: "Lahore", area: "DHA", systemType: "Deep Cleaning", installationType: "Residential", jobPaymentAmount: 12000 },
      { name: "Bright Office", phone: "0301-1100002", city: "Lahore", area: "Gulberg", systemType: "Office Cleaning", installationType: "Commercial", jobPaymentAmount: 18000 },
      { name: "City Restaurant", phone: "0301-1100003", city: "Lahore", area: "Model Town", systemType: "Kitchen Cleaning", installationType: "Commercial", jobPaymentAmount: 24000 },
      { name: "Park Apartments", phone: "0301-1100004", city: "Lahore", area: "Johar Town", systemType: "Move-out Cleaning", installationType: "Residential", jobPaymentAmount: 15000, status: "INACTIVE" }
    ]
  },
  {
    organization: {
      name: "Sample Maintenance Company",
      email: "admin@sample-maintenance.test",
      phone: "0300-2000001",
      address: "Karachi",
      status: "ACTIVE",
      plan: "PROFESSIONAL"
    },
    subscriptionPlan: "PROFESSIONAL",
    users: [
      { name: "Maintenance Admin", email: "admin@sample-maintenance.test", role: "ADMIN", status: "ACTIVE" },
      { name: "Maintenance Agent", email: "agent@sample-maintenance.test", role: "AGENT", status: "ACTIVE" },
      { name: "Maintenance Staff", email: "staff@sample-maintenance.test", role: "STAFF", status: "ACTIVE" }
    ],
    customers: [
      { name: "Metro Clinic", phone: "0301-2200001", city: "Karachi", area: "Clifton", systemType: "AC Maintenance", installationType: "Commercial", jobPaymentAmount: 9000 },
      { name: "Harbor Warehouse", phone: "0301-2200002", city: "Karachi", area: "Korangi", systemType: "Electrical Maintenance", installationType: "Industrial", jobPaymentAmount: 22000 },
      { name: "Seaview Apartments", phone: "0301-2200003", city: "Karachi", area: "DHA", systemType: "Plumbing Maintenance", installationType: "Residential", jobPaymentAmount: 14000 },
      { name: "North Mall", phone: "0301-2200004", city: "Karachi", area: "North Nazimabad", systemType: "General Maintenance", installationType: "Commercial", jobPaymentAmount: 26000 }
    ]
  },
  {
    organization: {
      name: "Trial Solar Company",
      email: "admin@trial-solar.test",
      phone: "0300-3000001",
      address: "Islamabad",
      status: "ACTIVE",
      plan: "ENTERPRISE"
    },
    subscriptionPlan: "ENTERPRISE",
    users: [
      { name: "Solar Admin", email: "admin@trial-solar.test", role: "ADMIN", status: "ACTIVE" },
      { name: "Solar Agent", email: "agent@trial-solar.test", role: "AGENT", status: "ACTIVE" },
      { name: "Solar Staff", email: "staff@trial-solar.test", role: "STAFF", status: "ACTIVE" }
    ],
    customers: [
      { name: "Margalla House", phone: "0301-3300001", city: "Islamabad", area: "F-8", systemType: "Solar Inspection", systemSize: "8kW", numberOfPanels: 16, installationType: "Residential", jobPaymentAmount: 11000 },
      { name: "Blue Area Office", phone: "0301-3300002", city: "Islamabad", area: "Blue Area", systemType: "Solar Cleaning", systemSize: "20kW", numberOfPanels: 40, installationType: "Commercial", jobPaymentAmount: 30000 }
    ]
  }
];

const summary = {
  organizations: 0,
  users: 1,
  customers: 0,
  jobs: 0,
  followUps: 0,
  callLogs: 0,
  payments: 0,
  contracts: 0,
  invoices: 0
};

for (const seed of organizationSeeds) {
  const organization = await upsertOrganization(seed.organization);
  await assignSubscription(organization, plansByCode[seed.subscriptionPlan]);
  await prisma.organizationFeature.deleteMany({ where: { organizationId: organization.id } });
  for (const featureCode of seed.overrides || []) {
    await prisma.organizationFeature.create({
      data: {
        organizationId: organization.id,
        featureId: featuresByCode[featureCode].id,
        enabled: true,
        source: "MANUAL"
      }
    });
  }
  summary.organizations += 1;

  const users = await Promise.all(seed.users.map((user) => upsertUser(organization.id, user)));
  summary.users += users.length;

  const admin = users.find((user) => user.role === "ADMIN");
  const agent = users.find((user) => user.role === "AGENT");
  const staff = users.find((user) => user.role === "STAFF");

  await prisma.invoice.deleteMany({ where: { organizationId: organization.id } });
  await prisma.contract.deleteMany({ where: { organizationId: organization.id } });
  await prisma.payment.deleteMany({ where: { organizationId: organization.id } });
  await prisma.followUp.deleteMany({ where: { organizationId: organization.id } });
  await prisma.callLog.deleteMany({ where: { organizationId: organization.id } });
  await prisma.job.deleteMany({ where: { organizationId: organization.id } });
  await prisma.customerSystem.deleteMany({ where: { organizationId: organization.id } });
  await prisma.customer.deleteMany({ where: { organizationId: organization.id } });

  const createdCustomers = [];
  for (let index = 0; index < seed.customers.length; index += 1) {
    const customerSeed = seed.customers[index];
    const customer = await upsertCustomer(organization, admin, customerSeed, index);
    createdCustomers.push(customer);
    summary.customers += 1;

    const jobs = [
      {
        scheduledDate: startOfDay(index - 2, 9 + index),
        scheduledTime: index % 2 === 0 ? "09:00" : "11:30",
        status: index % 3 === 0 ? "SCHEDULED" : "COMPLETED",
        completionDate: startOfDay(index - 2, 16),
        remarks: `Seed primary job for ${customer.name}`
      },
      {
        scheduledDate: startOfDay(index + 1, 13 + index),
        scheduledTime: index % 2 === 0 ? "13:00" : "15:30",
        status: index % 4 === 0 ? "RESCHEDULED" : "SCHEDULED",
        completionDate: null,
        remarks: `Seed upcoming job for ${customer.name}`
      }
    ];

    for (const jobSeed of jobs) {
      const job = await upsertJob(organization, customer, admin, agent, staff, jobSeed);
      summary.jobs += 1;

      const followUp = await upsertFollowUp(organization, customer, job, admin, {
        followUpDate: job.status === "COMPLETED" ? addDays(job.completionDate || job.scheduledDate, -1, 10) : addDays(job.scheduledDate, 2, 10),
        status: job.status === "COMPLETED" ? "PENDING" : "DONE",
        notes: `Seed follow-up for ${job.remarks}`
      });
      if (followUp) {
        summary.followUps += 1;
      }

      const callLog = await upsertCallLog(organization, customer, agent, {
        response: job.status === "COMPLETED" ? "INTERESTED" : "CALL_LATER",
        notes: `Seed call log for ${job.remarks}`,
        nextCallDate: addDays(new Date(), index + 1, 12)
      });
      if (callLog) {
        summary.callLogs += 1;
      }

      const payment = await upsertPayment(organization, customer, job, admin, {
        totalAmount: customerSeed.jobPaymentAmount,
        paidAmount: index % 2 === 0 ? customerSeed.jobPaymentAmount : Math.round(customerSeed.jobPaymentAmount / 2),
        paymentMethod: index % 2 === 0 ? "BANK_TRANSFER" : "CASH",
        paymentStatus: index % 2 === 0 ? "PAID" : "PARTIAL_PAID",
        paymentDate: job.completionDate || job.scheduledDate,
        remarks: `Seed payment for ${job.remarks}`
      });
      if (payment) {
        summary.payments += 1;
      }
    }
  }

  if (seed.subscriptionPlan === "PROFESSIONAL") {
    const { contract } = await seedContractExample(organization, createdCustomers[0], admin, staff, {
      contractNumber: "AMC-MAINT-36",
      title: "Annual Maintenance",
      description: "Monthly maintenance contract with billing after every three completed jobs.",
      serviceName: "Facility Maintenance Visit",
      serviceDescription: "Recurring preventive maintenance visit.",
      startDate: startOfDay(0, 9),
      endDate: addDays(startOfDay(0, 9), 365, 9),
      nextJobDate: addDays(startOfDay(0, 9), 30, 9),
      contractValue: 432000,
      totalJobs: 36,
      completedJobs: 3,
      nextSequence: 4,
      invoiceAfterCompletedJobs: 3,
      invoiceAmount: 36000,
      seedPaymentAmount: 12000,
      seedPaymentReference: "PARTIAL-TEST-001",
      seedPaymentNotes: "Seed partial payment against maintenance invoice",
      extraUnpaidInvoice: true
    });
    if (contract) {
      summary.contracts += 1;
      summary.jobs += 1;
      summary.invoices += 1 + 1;
      summary.payments += 1;
    }
  }

  if (seed.subscriptionPlan === "ENTERPRISE") {
    const { contract } = await seedContractExample(organization, createdCustomers[0], admin, staff, {
      contractNumber: "AMC-OFFICE-24",
      title: "Annual Office Cleaning",
      description: "Recurring office service contract with billing after every two completed jobs.",
      serviceName: "Office Service Visit",
      serviceDescription: "Recurring scheduled service visit.",
      startDate: startOfDay(0, 9),
      endDate: addDays(startOfDay(0, 9), 365, 9),
      nextJobDate: addDays(startOfDay(0, 9), 30, 9),
      contractValue: 288000,
      frequencyType: "CUSTOM",
      frequencyInterval: 15,
      totalJobs: 24,
      completedJobs: 2,
      nextSequence: 3,
      invoiceAfterCompletedJobs: 2,
      invoiceAmount: 24000,
      seedPaymentAmount: 24000,
      seedPaymentReference: "PAID-TEST-001",
      seedPaymentNotes: "Seed full payment against office invoice"
    });
    if (contract) {
      summary.contracts += 1;
      summary.jobs += 1;
      summary.invoices += 1;
      summary.payments += 1;
    }
  }
}

console.log(JSON.stringify({
  ...summary,
  password: "123456",
  logins: {
    systemAdmin: `${systemAdmin.email} / 123456`,
    cleaningAdmin: "admin@sample-cleaning.test / 123456",
    cleaningAgent: "agent@sample-cleaning.test / 123456",
    cleaningStaff: "staff@sample-cleaning.test / 123456",
    maintenanceAdmin: "admin@sample-maintenance.test / 123456",
    maintenanceAgent: "agent@sample-maintenance.test / 123456",
    maintenanceStaff: "staff@sample-maintenance.test / 123456",
    solarAdmin: "admin@trial-solar.test / 123456",
    solarAgent: "agent@trial-solar.test / 123456",
    solarStaff: "staff@trial-solar.test / 123456"
  }
}, null, 2));

await prisma.$disconnect();
