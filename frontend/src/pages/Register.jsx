import {useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {useAuth} from "../context/AuthContext";
import Icon from "../components/Icon";
import {getLanguage,setLanguage,t,languageOptions} from "../utils/i18n";

export default function Register(){
  const [form,setForm]=useState({full_name:"",email:"",password:""});
  const [confirm,setConfirm]=useState(""); const [language,setLang]=useState(getLanguage());
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const {register}=useAuth(); const nav=useNavigate();
  const changeLanguage=e=>{const v=e.target.value;setLang(v);setLanguage(v)};
  const submit=async e=>{e.preventDefault();if(form.password!==confirm){setError("Passwords do not match.");return}setBusy(true);setError("");
    try{await register(form);nav("/dashboard")}catch(err){const d=err.response?.data?.detail;setError(typeof d==="string"?d:"Registration failed. Please check your input.")}finally{setBusy(false)}};
  return <div className="min-h-screen bg-slate-950 p-4 sm:p-6"><div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[.95fr_1.05fr]">
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-300/15 blur-3xl"/><div><div className="flex items-center gap-3"><div className="brand-mark"><Icon name="shield" size={22}/></div><span className="text-lg font-black text-white">HealthGuardian</span></div><div className="mt-24 max-w-md"><div className="badge bg-white/10 text-teal-100">START YOUR HEALTH BASELINE</div><h1 className="mt-5 text-5xl font-black leading-tight text-white">One profile.<br/>Many smarter tools.</h1><p className="mt-5 text-sm leading-7 text-teal-50/80">Create a personal health workspace for AI guidance, reports, vitals, lifestyle plans, reminders and multilingual AI conversations.</p></div></div><div className="relative grid gap-2 text-xs text-teal-50/80"><div>✓ English, Hindi and Marathi AI guidance</div><div>✓ Health history and trend tracking</div><div>✓ Secure password recovery with OTP</div></div></div>
    <div className="flex items-center p-6 sm:p-12"><div className="mx-auto w-full max-w-md"><div className="flex items-center justify-between"><div className="flex items-center gap-3 lg:hidden"><div className="brand-mark"><Icon name="shield" size={22}/></div><span className="text-lg font-black text-white">HealthGuardian</span></div><LanguageSelect language={language} onChange={changeLanguage}/></div>
      <p className="section-kicker mt-8">{t(language,"registration")}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t(language,"registerTitle")}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(language,"registerSub")}</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label><span className="label">{t(language,"fullName")}</span><input className="input" required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
        <label><span className="label">{t(language,"email")}</span><input className="input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label><span className="label">{t(language,"password")}</span><input className="input" type="password" minLength="8" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
        <label><span className="label">{t(language,"confirm")}</span><input className="input" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
        {error&&<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        <button className="btn-primary w-full py-3.5" disabled={busy}>{busy?t(language,"creating"):t(language,"register")}<Icon name="arrow" size={17}/></button>
      </form><p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400"><Link className="font-black text-teal-700 hover:underline dark:text-teal-400" to="/login">{t(language,"already")}</Link></p>
    </div></div></div></div>
}
function LanguageSelect({language,onChange}){return <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon name="globe" size={15}/><span className="text-xs font-bold text-slate-500 dark:text-slate-400">Language</span><select className="bg-transparent text-xs font-bold outline-none dark:text-slate-200" value={language} onChange={onChange}>{languageOptions.map(([v,label])=><option key={v} value={v} className="dark:bg-slate-900 dark:text-white">{label}</option>)}</select></label>}
