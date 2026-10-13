import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import { getLanguage, setLanguage, t, languageOptions } from "../utils/i18n";

export default function PatientLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [language, setLang] = useState(getLanguage());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { patientLogin } = useAuth();
  const nav = useNavigate();

  const changeLanguage = (e) => {
    const value = e.target.value;
    setLang(value);
    setLanguage(value);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await patientLogin(identifier.trim(), password);
      nav("/patient/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(
        typeof msg === "string"
          ? msg
          : "Patient login failed. Please check your email/username and password."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.05fr_.95fr]">
        {/* Left Side: Brand & Patient Health Features */}
        <div className="dark-scope relative hidden overflow-hidden bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between" data-theme-scope="dark">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="brand-mark bg-teal-500 text-slate-950 p-2.5 rounded-2xl shadow-lg shadow-teal-500/20">
                  <Icon name="shield" size={22} />
                </div>
                <div>
                  <span className="text-lg font-black text-white">HealthGuardian</span>
                  <span className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                    Patient Portal
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-24 max-w-lg">
              <div className="badge bg-teal-400/10 text-teal-300">
                PATIENT PREVENTIVE HEALTHCARE
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl font-black leading-[1.08] text-white">
                Your personal health,
                <br />
                <span className="text-teal-300">smart and connected.</span>
              </h1>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Sign in to your patient portal to review personalized vitals trends, chat with our multilingual clinical AI assistant, manage WhatsApp medicine reminders, and schedule appointments with top doctors.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Feature icon="pulse" text="Vitals & trends" />
                <Feature icon="bot" text="Multilingual AI" />
                <Feature icon="bell" text="WhatsApp Reminders" />
                <Feature icon="calendar" text="Doctor Consults" />
              </div>
            </div>
          </div>
          <div className="relative text-[10px] text-slate-400">
            Confidential patient portal · Encrypted HIPAA-aligned healthcare records
          </div>
        </div>

        {/* Right Side: Patient Login Form */}
        <div className="flex items-center p-6 sm:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-end gap-3 mb-6">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Icon name="globe" size={15} />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t(language, "language")}
                </span>
                <select
                  className="bg-transparent text-xs font-bold outline-none dark:text-slate-200"
                  value={language}
                  onChange={changeLanguage}
                >
                  {languageOptions.map(([value, label]) => (
                    <option key={value} value={value} className="dark:bg-slate-900 dark:text-white">
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold mb-3">
              <span>👤 Patient Portal</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Patient Login
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Enter your patient email or username to access your account.
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
                  placeholder="patient@example.com or username"
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
                  className="text-xs font-bold text-teal-700 hover:underline dark:text-teal-400"
                >
                  Forgot Password?
                </Link>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300 space-y-1">
                  <div>{error}</div>
                  {error.includes("doctor") && (
                    <div className="pt-1">
                      <Link to="/doctor/login" className="font-bold underline text-red-800 dark:text-red-200">
                        → Click here to open Doctor Login
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn-primary w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:from-teal-500 hover:to-emerald-500 transition shadow-lg shadow-teal-600/20"
                disabled={busy}
              >
                {busy ? "Authenticating..." : "Login as Patient"}
                <Icon name="arrow" size={17} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                New Patient?{" "}
                <Link
                  className="font-black text-teal-700 hover:underline dark:text-teal-400"
                  to="/patient/register"
                >
                  Create Patient Account
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                Are you a healthcare provider?{" "}
                <Link to="/doctor/login" className="font-bold text-cyan-500 hover:underline">
                  Doctor Login Portal
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
