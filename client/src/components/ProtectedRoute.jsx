// components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { getUser, isLoggedIn } from "../auth";

export default function ProtectedRoute({ roles }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/main" replace />;
  }
  return <Outlet />;
}
