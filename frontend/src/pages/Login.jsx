import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import {
  getLanguage,
  setLanguage,
  t,
  languageOptions,
} from "../utils/i18n";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [language, setLang] = useState(getLanguage());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
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
      const loggedInUser = await login(email, password);
      if (loggedInUser?.role === "doctor") {
        nav("/doctor");
      } else if (loggedInUser?.role === "admin") {
        nav("/admin");
      } else {
        nav("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="brand-mark">
                <Icon name="shield" size={22} />
              </div>
              <span className="text-lg font-black text-white">HealthGuardian</span>
            </div>
            <div className="mt-28 max-w-lg">
              <div className="badge bg-teal-400/10 text-teal-300">
                AI PREVENTIVE HEALTH PLATFORM
              </div>
              <h1 className="mt-5 text-5xl font-black leading-[1.05] text-white">
                Your health,
                <br />
                <span className="text-teal-300">understood better.</span>
              </h1>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                One workspace for health tracking, AI guidance, reports, symptoms,
                nutrition, medication education, reminders and preventive care.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Feature icon="pulse" text="Vitals & trends" />
                <Feature icon="bot" text="Multilingual AI" />
                <Feature icon="file" text="Report summaries" />
                <Feature icon="heart" text="Wellness plans" />
              </div>
            </div>
          </div>
          <div className="relative text-[10px] text-slate-500 dark:text-slate-400">
            Informational wellness platform · Not a replacement for professional medical care
          </div>
        </div>
        <div className="flex items-center p-6 sm:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300 lg:hidden">
                <div className="brand-mark">
                  <Icon name="shield" size={18} />
                </div>
                HealthGuardian
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Icon name="globe" size={15} />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t(language, "language")}
                </span>
                <select className="bg-transparent text-xs font-bold outline-none dark:text-slate-200" value={language} onChange={changeLanguage}>
                  {languageOptions.map(([value, label]) => (
                    <option key={value} value={value} className="dark:bg-slate-900 dark:text-white">{label}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="section-kicker mt-8">{t(language, "welcome")}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t(language, "signinTitle")}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(language, "signinSub")}</p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <label>
                <span className="label">{t(language, "email")}</span>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              <label>
                <span className="label">{t(language, "password")}</span>
                <div className="relative">
                  <input className="input pr-16" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-3 text-xs font-black text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white" onClick={() => setShow(!show)}>
                    {show ? t(language, "hide") : t(language, "show")}
                  </button>
                </div>
              </label>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-black text-teal-700 hover:underline dark:text-teal-400">
                  {t(language, "forgot")}
                </Link>
              </div>
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}
              <button className="btn-primary w-full py-3.5" disabled={busy}>
                {busy ? t(language, "signingIn") : t(language, "signIn")}
                <Icon name="arrow" size={17} />
              </button>
            </form>
            <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">{t(language, "newUser")} <Link className="font-black text-teal-700 hover:underline dark:text-teal-400" to="/register">{t(language, "create")}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }) {
  return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold"><Icon name={icon} size={15} />{text}</div>;
}
