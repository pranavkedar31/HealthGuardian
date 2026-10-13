import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function DoctorLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { doctorLogin } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await doctorLogin(identifier.trim(), password);
      nav("/doctor/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(
        typeof msg === "string"
          ? msg
          : "Doctor login failed. Please verify your credentials."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.05fr_.95fr]">
        {/* Left Side: Clinical Branding */}
        <div className="dark-scope relative hidden overflow-hidden bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between border-r border-slate-800" data-theme-scope="dark">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="brand-mark bg-cyan-500 text-slate-950 p-2.5 rounded-2xl shadow-lg shadow-cyan-500/20">
                  <Icon name="shield" size={22} />
                </div>
                <div>
                  <span className="text-lg font-black text-white">HealthGuardian</span>
                  <span className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                    Clinician & Doctor Portal
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-24 max-w-lg">
              <div className="badge bg-cyan-400/10 text-cyan-300">
                AUTHORIZED CLINICAL PRACTITIONERS
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl font-black leading-[1.08] text-white">
                Integrated care,
                <br />
                <span className="text-cyan-300">clinical precision.</span>
              </h1>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Access your real-time appointments dashboard, patient electronic health records, daily schedule availability, and hospital practice settings.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Feature icon="calendar" text="Appointment Queue" />
                <Feature icon="user" text="Patient Records" />
                <Feature icon="clock" text="Practice Timings" />
                <Feature icon="check" text="Verified Doctor Status" />
              </div>
            </div>
          </div>
          <div className="relative text-[10px] text-slate-400">
            Authorized medical practitioner portal · Secure database session with role-based clinical isolation
          </div>
        </div>

        {/* Right Side: Doctor Login Form */}
        <div className="flex items-center p-6 sm:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-end gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 px-3 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                🩺 Doctor Portal
              </span>
            </div>

            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Doctor Login
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your clinical email or username to access your practice dashboard.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block">
                <span className="label font-bold text-xs text-slate-700 dark:text-slate-300">
                  Email / Username
                </span>
                <input
                  className="input mt-1.5 w-full rounded-2xl border border-slate-200 p-3.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="doctor@example.com or username"
                />
              </label>

              <label className="block">
                <span className="label font-bold text-xs text-slate-700 dark:text-slate-300">
                  Password
                </span>
                <div className="relative mt-1.5">
                  <input
                    className="input w-full rounded-2xl border border-slate-200 p-3.5 pr-16 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3.5 text-xs font-black text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white"
                    onClick={() => setShow(!show)}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-cyan-700 hover:underline dark:text-cyan-400"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 space-y-1">
                  <div>{error}</div>
                  {error.includes("patient") && (
                    <div className="pt-1">
                      <Link to="/patient/login" className="font-bold underline text-red-800 dark:text-red-200">
                        → Click here to open Patient Login
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn-primary w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:from-cyan-500 hover:to-teal-500 transition shadow-lg shadow-cyan-600/20"
                disabled={busy}
              >
                {busy ? "Authenticating Doctor..." : "Login as Doctor"}
                <Icon name="arrow" size={17} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                New Doctor?{" "}
                <Link
                  className="font-black text-cyan-700 hover:underline dark:text-cyan-400"
                  to="/doctor/register"
                >
                  Register as Doctor
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                Looking for the patient portal?{" "}
                <Link to="/patient/login" className="font-bold text-teal-600 hover:underline">
                  Patient Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold">
      <Icon name={icon} size={15} />
      <span>{text}</span>
    </div>
  );
}
