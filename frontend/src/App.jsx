import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import PortalLayout from "./components/PortalLayout";
import PortalRoute from "./components/PortalRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AddContract from "./pages/AddContract";
import AddCustomer from "./pages/AddCustomer";
import AddOrganization from "./pages/AddOrganization";
import AddOrganizationAdmin from "./pages/AddOrganizationAdmin";
import AddPayment from "./pages/AddPayment";
import AddQuotation from "./pages/AddQuotation";
import AccessDenied from "./pages/AccessDenied";
import Calendar from "./pages/Calendar";
import CallLogs from "./pages/CallLogs";
import CustomerDetails from "./pages/CustomerDetails";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import EditCustomer from "./pages/EditCustomer";
import EditJob from "./pages/EditJob";
import EditPayment from "./pages/EditPayment";
import EditQuotation from "./pages/EditQuotation";
import FollowUps from "./pages/FollowUps";
import ContractDetails from "./pages/ContractDetails";
import Contracts from "./pages/Contracts";
import InvoiceDetails from "./pages/InvoiceDetails";
import Invoices from "./pages/Invoices";
import JobDetails from "./pages/JobDetails";
import Jobs from "./pages/Jobs";
import Login from "./pages/Login";
import OrganizationDetails from "./pages/OrganizationDetails";
import OrganizationBilling from "./pages/OrganizationBilling";
import Organizations from "./pages/Organizations";
import PaymentDetails from "./pages/PaymentDetails";
import Payments from "./pages/Payments";
import PortalDashboard from "./pages/PortalDashboard";
import {
  PortalContractDetail,
  PortalContracts,
  PortalInvoiceDetail,
  PortalInvoices,
  PortalJobDetail,
  PortalJobs,
  PortalPaymentDetail,
  PortalPayments,
  PortalQuotationDetail,
  PortalQuotations,
  PortalServiceRequestDetail,
  PortalServiceRequests
} from "./pages/PortalLists";
import PortalLogin from "./pages/PortalLogin";
import PlansPlaceholder from "./pages/PlansPlaceholder";
import QuotationDetails from "./pages/QuotationDetails";
import Quotations from "./pages/Quotations";
import {
  ContractReports,
  CustomerReports,
  ExecutiveReports,
  FinancialReports,
  JobReports,
  ServiceRequestReports
} from "./pages/Reports";
import ScheduleJob from "./pages/ScheduleJob";
import ServiceRequests from "./pages/ServiceRequests";
import Settings from "./pages/Settings";
import SystemDashboard from "./pages/SystemDashboard";
import Users from "./pages/Users";
import WhatsAppLogs from "./pages/WhatsAppLogs";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import WhatsAppTemplates from "./pages/WhatsAppTemplates";

function SystemAdminRoute() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (user?.role !== "SYSTEM_ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function FeatureRoute({ feature }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (user?.role === "SYSTEM_ADMIN" || user?.features?.includes(feature)) {
    return <Outlet />;
  }

  return <Navigate to="/access-denied" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route element={<PortalRoute />}>
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="/portal/dashboard" element={<PortalDashboard />} />
          <Route path="/portal/quotations" element={<PortalQuotations />} />
          <Route path="/portal/quotations/:id" element={<PortalQuotationDetail />} />
          <Route path="/portal/contracts" element={<PortalContracts />} />
          <Route path="/portal/contracts/:id" element={<PortalContractDetail />} />
          <Route path="/portal/jobs" element={<PortalJobs />} />
          <Route path="/portal/jobs/:id" element={<PortalJobDetail />} />
          <Route path="/portal/invoices" element={<PortalInvoices />} />
          <Route path="/portal/invoices/:id" element={<PortalInvoiceDetail />} />
          <Route path="/portal/payments" element={<PortalPayments />} />
          <Route path="/portal/payments/:id" element={<PortalPaymentDetail />} />
          <Route path="/portal/service-requests" element={<PortalServiceRequests />} />
          <Route path="/portal/service-requests/:id" element={<PortalServiceRequestDetail />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route element={<FeatureRoute feature="CUSTOMERS" />}>
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/add" element={<AddCustomer />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
            <Route path="/customers/:id/edit" element={<EditCustomer />} />
          </Route>
          <Route element={<FeatureRoute feature="JOBS" />}>
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/schedule" element={<ScheduleJob />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/jobs/:id/edit" element={<EditJob />} />
            <Route path="/calendar" element={<Calendar />} />
          </Route>
          <Route element={<FeatureRoute feature="PAYMENTS" />}>
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/add" element={<AddPayment />} />
            <Route path="/payments/:id" element={<PaymentDetails />} />
            <Route path="/payments/:id/edit" element={<EditPayment />} />
          </Route>
          <Route element={<FeatureRoute feature="CALL_LOGS" />}>
            <Route path="/call-logs" element={<CallLogs />} />
          </Route>
          <Route element={<FeatureRoute feature="FOLLOW_UPS" />}>
            <Route path="/followups" element={<FollowUps />} />
          </Route>
          <Route element={<FeatureRoute feature="CONTRACTS" />}>
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/add" element={<AddContract />} />
            <Route path="/contracts/:id" element={<ContractDetails />} />
          </Route>
          <Route element={<FeatureRoute feature="QUOTATIONS" />}>
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/add" element={<AddQuotation />} />
            <Route path="/quotations/:id" element={<QuotationDetails />} />
            <Route path="/quotations/:id/edit" element={<EditQuotation />} />
          </Route>
          <Route element={<FeatureRoute feature="INVOICES" />}>
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
          </Route>
          <Route element={<FeatureRoute feature="WHATSAPP" />}>
            <Route path="/whatsapp/settings" element={<WhatsAppSettings />} />
            <Route path="/whatsapp/templates" element={<WhatsAppTemplates />} />
            <Route path="/whatsapp/logs" element={<WhatsAppLogs />} />
          </Route>
          <Route element={<FeatureRoute feature="REPORTS" />}>
            <Route path="/reports" element={<ExecutiveReports />} />
            <Route path="/reports/financial" element={<FinancialReports />} />
            <Route path="/reports/contracts" element={<ContractReports />} />
            <Route path="/reports/jobs" element={<JobReports />} />
            <Route path="/reports/customers" element={<CustomerReports />} />
            <Route path="/reports/service-requests" element={<ServiceRequestReports />} />
          </Route>
          <Route element={<FeatureRoute feature="CUSTOMER_PORTAL" />}>
            <Route path="/service-requests" element={<ServiceRequests />} />
          </Route>
          <Route element={<SystemAdminRoute />}>
            <Route path="/system" element={<SystemDashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/organizations/add" element={<AddOrganization />} />
            <Route path="/organizations/:id" element={<OrganizationDetails />} />
            <Route path="/organizations/admins/add" element={<AddOrganizationAdmin />} />
            <Route path="/organization-billing" element={<OrganizationBilling />} />
            <Route path="/plans" element={<PlansPlaceholder />} />
          </Route>
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
