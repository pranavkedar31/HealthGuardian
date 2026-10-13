import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// Role Selection & Dedicated Portals
import RoleSelection from "./pages/RoleSelection";
import PatientLogin from "./pages/PatientLogin";
import PatientRegister from "./pages/PatientRegister";
import DoctorLogin from "./pages/DoctorLogin";
import DoctorRegister from "./pages/DoctorRegister";

// Core App Pages
import Chatbot from "./pages/Chatbot";
import Dashboard from "./pages/Dashboard";
import DietWorkout from "./pages/DietWorkout";
import HealthProfile from "./pages/HealthProfile";
import Vitals from "./pages/Vitals";
import HealthHistory from "./pages/HealthHistory";
import HealthInsights from "./pages/HealthInsights";
import MedicineGuide from "./pages/MedicineGuide";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Appointments from "./pages/Appointments";
import Reminders from "./pages/Reminders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SymptomChecker from "./pages/SymptomChecker";
import HealthConnect from "./pages/HealthConnect";
import CentralizedRecords from "./pages/CentralizedRecords";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

import GlobalAlarm from "./components/GlobalAlarm";
import { initTheme } from "./utils/theme";
import { getLanguage, installDocumentTranslator } from "./utils/i18n";

const protectedRoutes = [
  // Patient Portal routes
  ["/patient/dashboard", Dashboard, ["patient", "admin"]],
  ["/dashboard", Dashboard, ["patient", "admin"]],
  ["/centralized-records", CentralizedRecords, ["patient", "admin"]],
  ["/health-profile", HealthProfile, ["patient", "admin"]],
  ["/vitals", Vitals, ["patient", "admin"]],
  ["/symptom-checker", SymptomChecker, ["patient", "admin"]],
  ["/appointments", Appointments, ["patient", "admin"]],
  ["/diet-workout", DietWorkout, ["patient", "admin"]],
  ["/reports", Reports, ["patient", "admin"]],
  ["/reminders", Reminders, ["patient", "admin"]],
  ["/chatbot", Chatbot, ["patient", "admin"]],
  ["/health-history", HealthHistory, ["patient", "admin"]],
  ["/health-insights", HealthInsights, ["patient", "admin"]],
  ["/medicine-guide", MedicineGuide, ["patient", "admin"]],
  ["/health-connect", HealthConnect, ["patient", "admin"]],
  ["/settings", Settings, ["patient", "admin"]],

  // Doctor Portal routes
  ["/doctor/dashboard", DoctorDashboard, ["doctor"]],
  ["/doctor/profile", DoctorDashboard, ["doctor"]],
  ["/doctor", DoctorDashboard, ["doctor"]],

  // Admin Portal route
  ["/admin", AdminDashboard, ["admin"]],
];

function GlobalThemeInitializer() {
  useEffect(() => {
    initTheme();
  }, []);
  return null;
}

function GlobalLanguageTranslator() {
  useEffect(() => {
    installDocumentTranslator(getLanguage());
  }, []);
  return null;
}

export default function App() {
  return (
    <>
      <GlobalThemeInitializer />
      <GlobalLanguageTranslator />
      <GlobalAlarm />

      <Routes>
        {/* Main Authentication & Role Selection Landing */}
        <Route path="/" element={<RoleSelection />} />

        {/* Dedicated Patient Auth Flow */}
        <Route path="/patient/login" element={<PatientLogin />} />
        <Route path="/patient/register" element={<PatientRegister />} />

        {/* Dedicated Doctor Auth Flow */}
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/register" element={<DoctorRegister />} />

        {/* Backward Compatibility Redirects */}
        <Route path="/login" element={<Navigate to="/patient/login" replace />} />
        <Route path="/register" element={<Navigate to="/patient/register" replace />} />

        {/* Password Recovery */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Role-Protected Application Routes */}
        {protectedRoutes.map(([path, Component, allowedRoles]) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <Component />
              </ProtectedRoute>
            }
          />
        ))}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}