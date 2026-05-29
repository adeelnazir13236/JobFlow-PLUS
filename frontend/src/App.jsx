import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AddCustomer from "./pages/AddCustomer";
import AddPayment from "./pages/AddPayment";
import Calendar from "./pages/Calendar";
import CallLogs from "./pages/CallLogs";
import CustomerDetails from "./pages/CustomerDetails";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import EditCustomer from "./pages/EditCustomer";
import EditJob from "./pages/EditJob";
import EditPayment from "./pages/EditPayment";
import FollowUps from "./pages/FollowUps";
import JobDetails from "./pages/JobDetails";
import Jobs from "./pages/Jobs";
import Login from "./pages/Login";
import OrganizationDetails from "./pages/OrganizationDetails";
import Organizations from "./pages/Organizations";
import PaymentDetails from "./pages/PaymentDetails";
import Payments from "./pages/Payments";
import ScheduleJob from "./pages/ScheduleJob";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

function SystemAdminRoute() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (user?.role !== "SYSTEM_ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/add" element={<AddCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetails />} />
          <Route path="/customers/:id/edit" element={<EditCustomer />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/schedule" element={<ScheduleJob />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/jobs/:id/edit" element={<EditJob />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/payments/add" element={<AddPayment />} />
          <Route path="/payments/:id" element={<PaymentDetails />} />
          <Route path="/payments/:id/edit" element={<EditPayment />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/call-logs" element={<CallLogs />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route element={<SystemAdminRoute />}>
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/organizations/:id" element={<OrganizationDetails />} />
          </Route>
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
