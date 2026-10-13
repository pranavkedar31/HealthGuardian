import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { getLanguage, setLanguage, t, languageOptions } from "../utils/i18n";
import apiClient from "../api/client";

export default function ForgotPassword() {
  const [language, setLang] = useState(getLanguage());
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("email");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const changeLang = (e) => {
    const v = e.target.value;
    setLang(v);
    setLanguage(v);
  };

  const send = async (e) => {
    e?.preventDefault();
    if (retryAfter > 0) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const r = await apiClient.post("/auth/forgot-password", { email });
      localStorage.setItem("hg_reset_email", email);
      const data = r.data || {};

      if (data.email_sent) {
        setMessage(
          data.message ||
            "A 6-digit OTP has been sent to your email. Check Inbox and Spam/Junk folders.",
        );
        setStage("otp");
      } else if (data.retry_after_seconds) {
        setRetryAfter(data.retry_after_seconds);
        setError(`Please wait ${data.retry_after_seconds} seconds before requesting another OTP.`);
      } else {
        setError(
          "The OTP email could not be delivered right now. Please check the Brevo sender/API configuration and try again.",
        );
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to send the OTP right now.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const r = await apiClient.post("/auth/verify-reset-otp", { email, otp });
      localStorage.setItem("hg_reset_token", r.data.reset_token);
      nav("/reset-password");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired OTP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell language={language} onLanguage={changeLang}>
      {stage === "email" ? (
        <>
          <p className="section-kicker">{t(language, "forgot")}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{t(language, "forgotTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(language, "forgotSub")}</p>
          <form onSubmit={send} className="mt-8 space-y-4">
            <label>
              <span className="label">{t(language, "email")}</span>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            {message && <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">{message}</div>}
            {error && <Error text={error} />}
            <button className="btn-primary w-full py-3.5" disabled={busy || retryAfter > 0}>
              {busy ? t(language, "sendingOtp") : retryAfter > 0 ? `Wait ${retryAfter}s` : t(language, "sendOtp")}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="section-kicker">{t(language, "verify")}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{t(language, "verifyTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(language, "verifySub")} <b className="text-slate-900 dark:text-white">{email}</b></p>
          <form onSubmit={verify} className="mt-8 space-y-4">
            <label>
              <span className="label">{t(language, "otp")}</span>
              <input className="input text-center text-xl font-black tracking-[.45em]" inputMode="numeric" autoComplete="one-time-code" maxLength="6" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            </label>
            {message && <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">{message}</div>}
            {error && <Error text={error} />}
            <button className="btn-primary w-full py-3.5" disabled={busy || otp.length !== 6}>{busy ? t(language, "verifying") : t(language, "verify")}<Icon name="check" size={17} /></button>
            <button type="button" className="btn-secondary w-full" disabled={busy || retryAfter > 0} onClick={() => send()}>{retryAfter > 0 ? `Resend available in ${retryAfter}s` : t(language, "resend")}</button>
          </form>
        </>
      )}
      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400"><Link className="font-black text-teal-700 hover:underline dark:text-teal-400" to="/login">← {t(language, "backLogin")}</Link></p>
    </AuthShell>
  );
}
function Error({ text }) {
  return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{text}</div>;
}

function AuthShell({ children, language, onLanguage }) {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center justify-center overflow-hidden rounded-[32px] bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="w-full max-w-md p-6 sm:p-12">
          <div className="flex items-center justify-between">
            <Link to="/login" className="flex items-center gap-3"><div className="brand-mark"><Icon name="shield" size={21} /></div><span className="font-black text-slate-900 dark:text-white">HealthGuardian</span></Link>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon name="globe" size={15} /><select className="bg-transparent text-xs font-bold outline-none dark:text-slate-200" value={language} onChange={onLanguage}>{languageOptions.map(([v, label]) => <option key={v} value={v} className="dark:bg-slate-900 dark:text-white">{label}</option>)}</select></label>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
