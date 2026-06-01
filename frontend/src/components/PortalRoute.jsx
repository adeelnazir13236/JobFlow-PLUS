import { Navigate, Outlet } from "react-router-dom";

export default function PortalRoute() {
  return localStorage.getItem("portalToken") ? <Outlet /> : <Navigate to="/portal/login" replace />;
}
