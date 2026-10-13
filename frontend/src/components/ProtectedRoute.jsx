import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm font-bold">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying HealthGuardian Session...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated redirection
  if (!user) {
    const isDoctorRoute =
      (allowedRoles && allowedRoles.includes("doctor")) ||
      location.pathname.startsWith("/doctor");
    return <Navigate to={isDoctorRoute ? "/doctor/login" : "/patient/login"} replace />;
  }

  // Default allowed roles to patient if not specified
  const effectiveRoles = allowedRoles && allowedRoles.length > 0 ? allowedRoles : ["patient", "admin"];

  // Role authorization check
  if (!effectiveRoles.includes(user.role)) {
    if (user.role === "doctor") {
      return <Navigate to="/doctor/dashboard" replace />;
    }
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/patient/dashboard" replace />;
  }

  return children;
}