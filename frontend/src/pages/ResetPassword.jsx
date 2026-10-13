import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import Icon from "../components/Icon";
import {getLanguage,setLanguage,t,languageOptions} from "../utils/i18n";
import apiClient from "../api/client";

export default function ResetPassword(){
  const [language,setLang]=useState(getLanguage()); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const nav=useNavigate();
  const email=localStorage.getItem("hg_reset_email")||""; const resetToken=localStorage.getItem("hg_reset_token")||"";
  const changeLang=e=>{const v=e.target.value;setLang(v);setLanguage(v)};
  const submit=async e=>{e.preventDefault();if(!resetToken||!email){setError("Your reset session is missing. Please request a new OTP.");return}
    if(password!==confirm){setError("Passwords do not match.");return}setBusy(true);setError("");
    try{await apiClient.post("/auth/reset-password",{email,reset_token:resetToken,new_password:password});localStorage.removeItem("hg_reset_email");localStorage.removeItem("hg_reset_token");nav("/login")}
    catch(err){setError(err.response?.data?.detail||"Unable to update password.")}finally{setBusy(false)}};
  return <div className="min-h-screen bg-slate-950 p-4 sm:p-6"><div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center justify-center overflow-hidden rounded-[32px] bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"><div className="w-full max-w-md p-6 sm:p-12">
    <div className="flex items-center justify-between"><Link to="/login" className="flex items-center gap-3"><div className="brand-mark"><Icon name="shield" size={21}/></div><span className="font-black text-slate-900 dark:text-white">HealthGuardian</span></Link><label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon name="globe" size={15}/><select className="bg-transparent text-xs font-bold outline-none dark:text-slate-200" value={language} onChange={changeLang}>{languageOptions.map(([v,label])=><option key={v} value={v} className="dark:bg-slate-900 dark:text-white">{label}</option>)}</select></label></div>
    <p className="section-kicker mt-8">{t(language,"resetTitle")}</p><h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{t(language,"resetTitle")}</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(language,"resetSub")}</p>
    <form onSubmit={submit} className="mt-8 space-y-4"><label><span className="label">{t(language,"newPassword")}</span><input className="input" type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)}/></label><label><span className="label">{t(language,"confirmPassword")}</span><input className="input" type="password" minLength="8" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}<button className="btn-primary w-full py-3.5" disabled={busy}>{busy?t(language,"updating"):t(language,"updatePassword")}<Icon name="check" size={17}/></button></form>
    <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400"><Link className="font-black text-teal-700 hover:underline dark:text-teal-400" to="/login">{t(language,"backLogin")}</Link></p>
  </div></div></div>
}
