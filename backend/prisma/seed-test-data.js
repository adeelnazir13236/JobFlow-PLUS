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
    name: "Demo",
    code: "DEMO",
    description: "Trial access for evaluating JOBFLOW PLUS before paid subscription.",
    monthlyPrice: 0,
    halfYearlyPrice: 0,
    yearlyPrice: 0,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS"]
  },
  {
    name: "Starter",
    code: "STARTER",
    description: "Essential field operations for small teams.",
    monthlyPrice: 0,
    halfYearlyPrice: 0,
    yearlyPrice: 0,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS"]
  },
  {
    name: "Professional",
    code: "PROFESSIONAL",
    description: "Advanced operations, finance, and recurring work.",
    monthlyPrice: 49,
    halfYearlyPrice: 294,
    yearlyPrice: 499,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS", "REPORTS", "CONTRACTS", "RECURRING_JOBS", "QUOTATIONS", "INVOICES", "PAYMENTS"]
  },
  {
    name: "Enterprise",
    code: "ENTERPRISE",
    description: "Full platform access with integrations, portal, and AI.",
    monthlyPrice: 149,
    halfYearlyPrice: 894,
    yearlyPrice: 1499,
    features: featureSeeds.map(([code]) => code)
  }
];

const whatsappTemplateSeeds = [
  ["QUOTATION_SENT", "Quotation Sent", "SALES", "Hello {{customer_name}}, your quotation {{quotation_number}} for {{amount}} is ready. View: {{document_link}}"],
  ["INVOICE_SENT", "Invoice Sent", "FINANCE", "Hello {{customer_name}}, invoice {{invoice_number}} for {{amount}} has been generated. View: {{document_link}}"],
  ["PAYMENT_RECEIVED", "Payment Received", "FINANCE", "Hello {{customer_name}}, payment of {{amount}} has been received. Receipt: {{document_link}}"],
  ["JOB_ASSIGNED", "Job Assigned", "JOBS", "Hello {{customer_name}}, your job is scheduled for {{job_date}} at {{job_time}}."],
  ["JOB_REMINDER", "Job Reminder", "JOBS", "Hello {{customer_name}}, reminder: your job is scheduled for {{job_date}} at {{job_time}}."],
  ["CONTRACT_RENEWAL", "Contract Renewal", "CONTRACTS", "Hello {{customer_name}}, contract {{contract_number}} expires on {{contract_end_date}}. Please contact us for renewal."],
  ["PAYMENT_REMINDER", "Payment Reminder", "FINANCE", "Hello {{customer_name}}, payment reminder for invoice {{invoice_number}}. Outstanding amount: {{amount}}. Due date: {{due_date}}."]
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
      update: { name: seed.name, description: seed.description, monthlyPrice: seed.monthlyPrice, halfYearlyPrice: seed.halfYearlyPrice, yearlyPrice: seed.yearlyPrice, status: "ACTIVE" },
      create: { name: seed.name, code: seed.code, description: seed.description, monthlyPrice: seed.monthlyPrice, halfYearlyPrice: seed.halfYearlyPrice, yearlyPrice: seed.yearlyPrice, status: "ACTIVE" }
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

async function seedWhatsAppSetup(organization) {
  const existingSetting = await prisma.whatsAppSetting.findFirst({ where: { organizationId: organization.id } });
  if (existingSetting) {
    await prisma.whatsAppSetting.update({ where: { id: existingSetting.id }, data: { providerType: "MOCK", senderNumber: "+10000000000", isActive: true } });
  } else {
    await prisma.whatsAppSetting.create({ data: { organizationId: organization.id, providerType: "MOCK", senderNumber: "+10000000000", isActive: true } });
  }

  for (const [templateCode, templateName, category, messageBody] of whatsappTemplateSeeds) {
    await prisma.whatsAppTemplate.upsert({
      where: { organizationId_templateCode: { organizationId: organization.id, templateCode } },
      update: { templateName, category, messageBody, isSystemTemplate: true, isActive: true },
      create: { organizationId: organization.id, templateCode, templateName, category, messageBody, isSystemTemplate: true, isActive: true }
    });
  }
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

async function createPortalUser(organization, customer, portalSeed) {
  return prisma.customerPortalUser.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      name: portalSeed.name || `${customer.name} Portal User`,
      email: portalSeed.email,
      phone: portalSeed.phone || customer.phone,
      passwordHash: password,
      status: portalSeed.status || "ACTIVE"
    }
  });
}

async function createServiceRequest(organization, customer, portalUser, requestSeed) {
  const request = await prisma.serviceRequest.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      portalUserId: portalUser?.id || null,
      requestNumber: `TMP-SEED-SR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      requestType: requestSeed.requestType,
      title: requestSeed.title,
      description: requestSeed.description,
      priority: requestSeed.priority || "MEDIUM",
      status: requestSeed.status || "OPEN",
      relatedContractId: requestSeed.relatedContractId || null,
      relatedJobId: requestSeed.relatedJobId || null
    }
  });

  return prisma.serviceRequest.update({
    where: { id: request.id },
    data: { requestNumber: `SR-SEED-${organization.id}-${request.id}` }
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

function quotationTotals(items, discountType = null, discountValue = 0, taxRate = 0) {
  const normalizedItems = items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.quantity) * Number(item.unitPrice)
  }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = discountType === "PERCENTAGE"
    ? subtotal * (Number(discountValue) / 100)
    : discountType === "FIXED"
      ? Math.min(Number(discountValue), subtotal)
      : 0;
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = taxableAmount * (Number(taxRate) / 100);

  return {
    items: normalizedItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount: taxableAmount + taxAmount
  };
}

async function createSeedQuotation(organization, customer, admin, quotationSeed) {
  const totals = quotationTotals(quotationSeed.items, quotationSeed.discountType, quotationSeed.discountValue, quotationSeed.taxRate);

  const quotation = await prisma.quotation.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      quotationNumber: quotationSeed.quotationNumber,
      title: quotationSeed.title,
      description: quotationSeed.description,
      quotationDate: quotationSeed.quotationDate,
      validUntil: quotationSeed.validUntil,
      status: quotationSeed.status,
      subtotal: totals.subtotal,
      discountType: quotationSeed.discountType,
      discountValue: quotationSeed.discountValue || 0,
      discountAmount: totals.discountAmount,
      taxRate: quotationSeed.taxRate || 0,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      notes: quotationSeed.notes,
      terms: quotationSeed.terms,
      createdByUserId: admin.id,
      items: {
        create: totals.items.map((item) => ({
          organizationId: organization.id,
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        }))
      }
    }
  });

  if (quotationSeed.convertToJob) {
    const job = await prisma.job.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        scheduledDate: addDays(new Date(), 3, 10),
        scheduledTime: "10:00",
        status: "SCHEDULED",
        remarks: `${quotation.title}\n\n${quotation.description || ""}`,
        createdById: admin.id,
        updatedById: admin.id
      }
    });
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "CONVERTED", convertedToType: "JOB", convertedJobId: job.id }
    });
    return { quotation, job };
  }

  if (quotationSeed.convertToContract) {
    const contract = await prisma.contract.create({
      data: {
        organizationId: organization.id,
        customerId: customer.id,
        contractNumber: `CON-${quotation.quotationNumber}`,
        title: quotation.title,
        description: [quotation.description, quotation.notes, quotation.terms].filter(Boolean).join("\n\n"),
        startDate: new Date(),
        endDate: addDays(new Date(), 365, 10),
        contractValue: quotation.totalAmount,
        status: "DRAFT",
        createdByUserId: admin.id
      }
    });
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "CONVERTED", convertedToType: "CONTRACT", convertedContractId: contract.id }
    });
    return { quotation, contract };
  }

  return { quotation };
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
    overrides: ["WHATSAPP", "CUSTOMER_PORTAL"],
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
  invoices: 0,
  quotations: 0,
  whatsappTemplates: 0,
  whatsappLogs: 0,
  portalUsers: 0,
  serviceRequests: 0
};

const portalLogins = [];

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

  await prisma.whatsAppMessageLog.deleteMany({ where: { organizationId: organization.id } });
  await prisma.serviceRequest.deleteMany({ where: { organizationId: organization.id } });
  await prisma.customerPortalUser.deleteMany({ where: { organizationId: organization.id } });
  await prisma.invoice.deleteMany({ where: { organizationId: organization.id } });
  await prisma.quotation.deleteMany({ where: { organizationId: organization.id } });
  await prisma.contract.deleteMany({ where: { organizationId: organization.id } });
  await prisma.payment.deleteMany({ where: { organizationId: organization.id } });
  await prisma.followUp.deleteMany({ where: { organizationId: organization.id } });
  await prisma.callLog.deleteMany({ where: { organizationId: organization.id } });
  await prisma.job.deleteMany({ where: { organizationId: organization.id } });
  await prisma.customerSystem.deleteMany({ where: { organizationId: organization.id } });
  await prisma.customer.deleteMany({ where: { organizationId: organization.id } });
  await seedWhatsAppSetup(organization);
  summary.whatsappTemplates += whatsappTemplateSeeds.length;

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

  let portalUser = null;
  if (createdCustomers[0]) {
    portalUser = await createPortalUser(organization, createdCustomers[0], {
      name: `${createdCustomers[0].name} Portal`,
      email: `${slug(createdCustomers[0].name)}.portal@${slug(organization.name)}.test`,
      phone: createdCustomers[0].phone
    });
    summary.portalUsers += 1;
    portalLogins.push(`${portalUser.email} / 123456 (${seed.subscriptionPlan}${seed.overrides?.includes("CUSTOMER_PORTAL") || seed.subscriptionPlan === "ENTERPRISE" ? ", portal enabled" : ", portal blocked by plan"})`);
  }

  if (portalUser) {
    const portalQuotation = await createSeedQuotation(organization, createdCustomers[0], admin, {
      quotationNumber: `QUO-PORTAL-${organization.id}`,
      title: `${createdCustomers[0].name} portal estimate`,
      description: "Sample quotation visible in the customer portal.",
      quotationDate: startOfDay(-1, 10),
      validUntil: addDays(new Date(), 14, 10),
      status: "SENT",
      discountType: null,
      discountValue: 0,
      taxRate: 0,
      notes: "Customer can approve or reject this quotation from the portal.",
      terms: "Valid for 14 days.",
      items: [{ itemName: "Portal sample service", description: "Service estimate for portal testing", quantity: 1, unitPrice: createdCustomers[0].jobPaymentAmount }]
    });
    if (portalQuotation.quotation) {
      summary.quotations += 1;
    }
  }

  if (seed.subscriptionPlan === "PROFESSIONAL") {
    const quotationSeeds = [
      { quotationNumber: "QUO-SEED-DRAFT", title: "Draft maintenance estimate", description: "General repair estimate awaiting review.", quotationDate: startOfDay(-2, 10), validUntil: addDays(new Date(), 14, 10), status: "DRAFT", discountType: null, discountValue: 0, taxRate: 0, notes: "Draft quotation", terms: "Valid for 14 days", items: [{ itemName: "Inspection", description: "Site inspection", quantity: 1, unitPrice: 5000 }, { itemName: "Repair labor", description: "Estimated labor", quantity: 2, unitPrice: 4500 }] },
      { quotationNumber: "QUO-SEED-SENT", title: "Sent maintenance estimate", description: "Sent quotation for facility service.", quotationDate: startOfDay(-1, 10), validUntil: addDays(new Date(), 15, 10), status: "SENT", discountType: "PERCENTAGE", discountValue: 5, taxRate: 0, notes: "Sent to customer", terms: "Payment on approval", items: [{ itemName: "Preventive service", description: "One-time preventive service", quantity: 1, unitPrice: 18000 }] },
      { quotationNumber: "QUO-SEED-ACCEPTED", title: "Accepted maintenance estimate", description: "Accepted quotation ready for conversion.", quotationDate: startOfDay(0, 10), validUntil: addDays(new Date(), 20, 10), status: "ACCEPTED", discountType: "FIXED", discountValue: 1000, taxRate: 5, notes: "Customer approved by phone", terms: "Schedule within this week", items: [{ itemName: "Emergency repair", description: "Repair work", quantity: 1, unitPrice: 25000 }, { itemName: "Parts", description: "Replacement parts", quantity: 3, unitPrice: 2500 }] },
      { quotationNumber: "QUO-SEED-JOB", title: "Converted job quotation", description: "Quotation already converted into a one-time job.", quotationDate: startOfDay(-5, 10), validUntil: addDays(new Date(), 10, 10), status: "ACCEPTED", discountType: null, discountValue: 0, taxRate: 0, notes: "Converted to job", terms: "Standard terms", convertToJob: true, items: [{ itemName: "One-time service", description: "Converted job service", quantity: 1, unitPrice: 12000 }] },
      { quotationNumber: "QUO-SEED-CONTRACT", title: "Converted contract quotation", description: "Quotation already converted into a draft contract.", quotationDate: startOfDay(-4, 10), validUntil: addDays(new Date(), 12, 10), status: "ACCEPTED", discountType: null, discountValue: 0, taxRate: 0, notes: "Converted to contract", terms: "Add service schedule later", convertToContract: true, items: [{ itemName: "Annual support", description: "Draft contract conversion", quantity: 12, unitPrice: 9000 }] }
    ];
    for (const quotationSeed of quotationSeeds) {
      const result = await createSeedQuotation(organization, createdCustomers[0], admin, quotationSeed);
      summary.quotations += 1;
      if (result.job) {
        summary.jobs += 1;
      }
      if (result.contract) {
        summary.contracts += 1;
      }
    }

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

  if (portalUser) {
    const sampleContract = await prisma.contract.findFirst({ where: { organizationId: organization.id, customerId: createdCustomers[0].id }, orderBy: { createdAt: "desc" } });
    const sampleJob = await prisma.job.findFirst({ where: { organizationId: organization.id, customerId: createdCustomers[0].id }, orderBy: { scheduledDate: "desc" } });
    await createServiceRequest(organization, createdCustomers[0], portalUser, {
      requestType: "COMPLAINT",
      title: "Service quality follow-up",
      description: "Customer reported that one area needs a follow-up visit.",
      priority: "HIGH",
      status: "OPEN",
      relatedContractId: sampleContract?.id,
      relatedJobId: sampleJob?.id
    });
    await createServiceRequest(organization, createdCustomers[0], portalUser, {
      requestType: "NEW_SERVICE",
      title: "Request additional service",
      description: "Customer requested pricing for an additional service slot.",
      priority: "MEDIUM",
      status: "IN_REVIEW"
    });
    summary.serviceRequests += 2;
  }

  const sampleQuotation = await prisma.quotation.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" } });
  const sampleInvoice = await prisma.invoice.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" } });
  const samplePayment = await prisma.payment.findFirst({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" } });
  const sampleCustomer = createdCustomers[0];
  const sampleLogs = [
    sampleQuotation ? { templateCode: "QUOTATION_SENT", quotationId: sampleQuotation.id, customerId: sampleQuotation.customerId, messageBody: `Seed WhatsApp quotation message for ${sampleQuotation.quotationNumber}` } : null,
    sampleInvoice ? { templateCode: "INVOICE_SENT", invoiceId: sampleInvoice.id, contractId: sampleInvoice.contractId, customerId: sampleInvoice.customerId, messageBody: `Seed WhatsApp invoice message for ${sampleInvoice.invoiceNumber}` } : null,
    samplePayment ? { templateCode: "PAYMENT_RECEIVED", paymentId: samplePayment.id, invoiceId: samplePayment.invoiceId, contractId: samplePayment.contractId, jobId: samplePayment.jobId, customerId: samplePayment.customerId, messageBody: `Seed WhatsApp payment message for ${samplePayment.paymentNumber || samplePayment.invoiceNumber}` } : null
  ].filter(Boolean);

  for (const log of sampleLogs) {
    await prisma.whatsAppMessageLog.create({
      data: {
        organizationId: organization.id,
        phoneNumber: sampleCustomer?.whatsapp || sampleCustomer?.phone || "N/A",
        providerType: "MOCK",
        status: "SENT",
        sentAt: new Date(),
        ...log
      }
    });
    summary.whatsappLogs += 1;
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
  },
  portalLogins
}, null, 2));

await prisma.$disconnect();
