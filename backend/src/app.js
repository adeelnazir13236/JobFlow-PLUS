import cors from "cors";
import express from "express";
import path from "path";
import authRoutes from "./routes/auth.routes.js";
import callLogRoutes from "./routes/callLog.routes.js";
import contractRoutes from "./routes/contract.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import followUpRoutes from "./routes/followUp.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import jobRoutes from "./routes/job.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import organizationBillingRoutes from "./routes/organizationBilling.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import planRoutes from "./routes/plan.routes.js";
import portalRoutes from "./routes/portal.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import reportRoutes from "./routes/report.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import userRoutes from "./routes/user.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import technicianRoutes from "./routes/technician.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/organization-billing", organizationBillingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/technician", technicianRoutes);
app.use("/api/call-logs", callLogRoutes);
app.use("/api/followups", followUpRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
