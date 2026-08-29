// Bootstraps the plan catalogue and subscribes one organization to a plan.
// Unlike seed-test-data.js this creates no demo orgs, users, or job data, so it
// is safe to run against production. Idempotent — re-running only refreshes the
// catalogue and issues a new active subscription.
//
//   node prisma/seed-plans.js [organizationId] [planCode]
//
// Defaults to organization 1 on ENTERPRISE, which carries every feature.

import prisma from "../src/config/prisma.js";

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
  ["TECHNICIAN_WORKSPACE", "Technician Workspace", "Field technician workspace and job operations", "Operations"],
  ["GPS_TRACKING", "GPS Tracking", "Technician job check-in and check-out geo verification", "Operations"],
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
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS", "TECHNICIAN_WORKSPACE"]
  },
  {
    name: "Starter",
    code: "STARTER",
    description: "Essential field operations for small teams.",
    monthlyPrice: 0,
    halfYearlyPrice: 0,
    yearlyPrice: 0,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS", "TECHNICIAN_WORKSPACE"]
  },
  {
    name: "Professional",
    code: "PROFESSIONAL",
    description: "Advanced operations, finance, and recurring work.",
    monthlyPrice: 49,
    halfYearlyPrice: 294,
    yearlyPrice: 499,
    features: ["DASHBOARD", "CUSTOMERS", "JOBS", "FOLLOW_UPS", "CALL_LOGS", "REPORTS", "CONTRACTS", "RECURRING_JOBS", "QUOTATIONS", "INVOICES", "PAYMENTS", "TECHNICIAN_WORKSPACE", "GPS_TRACKING"]
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

const organizationId = Number(process.argv[2] || 1);
const planCode = (process.argv[3] || "ENTERPRISE").toUpperCase();

if (!Number.isInteger(organizationId) || organizationId <= 0) {
  throw new Error(`Invalid organization id: ${process.argv[2]}`);
}

const organization = await prisma.organization.findUnique({ where: { id: organizationId } });

if (!organization) {
  throw new Error(`Organization ${organizationId} not found`);
}

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

const plan = plansByCode[planCode];

if (!plan) {
  throw new Error(`Unknown plan code: ${planCode}. Available: ${Object.keys(plansByCode).join(", ")}`);
}

await prisma.organizationSubscription.updateMany({
  where: { organizationId, status: "ACTIVE" },
  data: { status: "INACTIVE" }
});

await prisma.organizationSubscription.create({
  data: { organizationId, planId: plan.id, status: "ACTIVE", billingCycle: "MONTHLY", startDate: new Date() }
});

await prisma.organization.update({ where: { id: organizationId }, data: { plan: plan.code } });

console.log(JSON.stringify({
  organization: { id: organization.id, name: organization.name },
  plan: plan.code,
  features: plan.code === "ENTERPRISE" ? featureSeeds.length : planSeeds.find((seed) => seed.code === plan.code).features.length
}, null, 2));
