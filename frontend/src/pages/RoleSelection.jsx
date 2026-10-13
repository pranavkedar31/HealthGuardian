import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function RoleSelection() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/patient/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div
      className="dark-scope min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-10 text-white relative overflow-hidden"
      data-theme-scope="dark"
    >
      {/* Background ambient glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between py-2 !bg-transparent !border-0 !border-transparent">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <Icon name="shield" size={20} />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">HealthGuardian</span>
            <span className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest">
              Clinical & Preventive Healthcare
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Active</span>
        </div>
      </header>

      {/* Main Choice Section */}
      <main className="relative z-10 max-w-4xl mx-auto w-full my-auto py-12 text-center !bg-transparent">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-bold text-teal-300 mb-6 backdrop-blur-sm">
          <span>SECURE HEALTHCARE ECOSYSTEM</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black !text-white tracking-tight leading-[1.1] mb-4">
          HEALTHGUARDIAN
        </h1>
        <p className="text-lg sm:text-xl font-medium !text-slate-300 max-w-xl mx-auto mb-12">
          How would you like to continue?
        </p>

        {/* 2 Clear Role Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto text-left">
          {/* Card 1: PATIENT */}
          <div className="group relative rounded-[28px] border border-slate-800 bg-slate-900/90 hover:bg-slate-900 hover:border-teal-500/50 p-6 sm:p-8 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-teal-500/10 flex flex-col justify-between">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                👤
              </div>
              <h2 className="text-2xl font-black !text-white mb-2">Patient Portal</h2>
              <p className="text-sm !text-slate-400 leading-relaxed mb-6">
                Access your personalized preventive health dashboard, vitals tracking, AI clinical assistant, medication reminders, and doctor appointments.
              </p>
              <ul className="text-xs !text-slate-300 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-teal-400">✓</span> Multilingual AI Chatbot & ML Risk Analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-400">✓</span> WhatsApp & Audio Medicine Reminders
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-400">✓</span> Digital Health Records & Reports
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                to="/patient/login"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 text-sm font-black text-slate-950 hover:from-teal-400 hover:to-emerald-400 transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98]"
              >
                <span>Continue as Patient</span>
                <Icon name="arrow" size={16} />
              </Link>
              <div className="text-center text-xs text-slate-400">
                New patient?{" "}
                <Link to="/patient/register" className="font-bold text-teal-400 hover:underline">
                  Create patient account
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: DOCTOR */}
          <div className="group relative rounded-[28px] border border-slate-800 bg-slate-900/90 hover:bg-slate-900 hover:border-cyan-500/50 p-6 sm:p-8 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                🩺
              </div>
              <h2 className="text-2xl font-black !text-white mb-2">Doctor Portal</h2>
              <p className="text-sm !text-slate-400 leading-relaxed mb-6">
                Manage clinical consultations, patient health records, daily schedule, and hospital practice details with verified professional access.
              </p>
              <ul className="text-xs !text-slate-300 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span> Appointment Management & Patient Queue
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span> Electronic Health Records & Vitals Review
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">✓</span> Practice & Availability Management
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                to="/doctor/login"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-4 text-sm font-black text-slate-950 hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
              >
                <span>Continue as Doctor</span>
                <Icon name="arrow" size={16} />
              </Link>
              <div className="text-center text-xs text-slate-400">
                New doctor?{" "}
                <Link to="/doctor/register" className="font-bold text-cyan-400 hover:underline">
                  Register as Doctor
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full text-center text-xs !text-slate-500 py-4 border-t border-slate-900 !bg-transparent">
        <p>HealthGuardian Preventive Healthcare Platform · Confidential and HIPAA-aligned architecture</p>
      </footer>
    </div>
  );
}
