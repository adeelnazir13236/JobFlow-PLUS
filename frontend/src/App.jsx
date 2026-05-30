import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AddContract from "./pages/AddContract";
import AddCustomer from "./pages/AddCustomer";
import AddOrganization from "./pages/AddOrganization";
import AddOrganizationAdmin from "./pages/AddOrganizationAdmin";
import AddPayment from "./pages/AddPayment";
import AccessDenied from "./pages/AccessDenied";
import Calendar from "./pages/Calendar";
import CallLogs from "./pages/CallLogs";
import CustomerDetails from "./pages/CustomerDetails";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import EditCustomer from "./pages/EditCustomer";
import EditJob from "./pages/EditJob";
import EditPayment from "./pages/EditPayment";
import FollowUps from "./pages/FollowUps";
import ContractDetails from "./pages/ContractDetails";
import Contracts from "./pages/Contracts";
import InvoiceDetails from "./pages/InvoiceDetails";
import Invoices from "./pages/Invoices";
import JobDetails from "./pages/JobDetails";
import Jobs from "./pages/Jobs";
import Login from "./pages/Login";
import OrganizationDetails from "./pages/OrganizationDetails";
import Organizations from "./pages/Organizations";
import PaymentDetails from "./pages/PaymentDetails";
import Payments from "./pages/Payments";
import PlansPlaceholder from "./pages/PlansPlaceholder";
import ScheduleJob from "./pages/ScheduleJob";
import Settings from "./pages/Settings";
import SystemDashboard from "./pages/SystemDashboard";
import Users from "./pages/Users";

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
          <Route element={<FeatureRoute feature="INVOICES" />}>
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
          </Route>
          <Route element={<SystemAdminRoute />}>
            <Route path="/system" element={<SystemDashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/organizations/add" element={<AddOrganization />} />
            <Route path="/organizations/:id" element={<OrganizationDetails />} />
            <Route path="/organizations/admins/add" element={<AddOrganizationAdmin />} />
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
