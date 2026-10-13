import {useEffect,useRef,useState} from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import ResourceCard from "../components/ResourceCard";
import * as chat from "../api/chat";
import {useSpeech} from "../utils/speech";

const prompts={
  English:[
    "Explain my blood pressure readings in simple words",
    "Healthy meal ideas for diabetes prevention",
    "10-minute guided meditation routine for stress",
    "Beginner home workout routine without equipment",
    "Safe sleep routine and relaxation habits"
  ],
  Hindi:[
    "रक्तचाप (BP) को सामान्य रखने के सरल उपाय",
    "मधुमेह से बचाव के लिए संतुलित भारतीय आहार",
    "तनाव कम करने के लिए 10 मिनट का ध्यान (meditation)",
    "घर पर बिना उपकरण के आसान व्यायाम",
    "अच्छी नींद के लिए सोने से पहले की आदतें"
  ],
  Marathi:[
    "रक्तदाब नियंत्रित ठेवण्यासाठी सोपे घरगुती उपाय",
    "मधुमेह प्रतिबंधासाठी पौष्टिक महाराष्ट्रीयन आहार",
    "मानसिक शांततेसाठी 10 मिनिटांचे ध्यान (meditation)",
    "घरी करता येणारा सोपा आणि सुरक्षित व्यायाम",
    "शांत झोपेसाठी उपयुक्त सवयी आणि दिनचर्या"
  ]
};

export default function Chatbot(){
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [language,setLanguage]=useState("English");
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const [failedQuery,setFailedQuery]=useState("");
  const bottomRef=useRef(null);
  const {speakText,stopSpeaking,speakingId,rate,setRate,ready:voiceReady}=useSpeech(language);

  useEffect(()=>{
    chat.getChatHistory().then(r=>setMessages(r.data||[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages,sending]);

  const send=async text=>{
    const q=(text||input).trim();
    if(!q||sending)return;
    setInput("");
    setError("");
    setFailedQuery("");
    setSending(true);

    const tempId=`temp-${Date.now()}`;
    const optimisticMessage={
      id:tempId,
      message:q,
      is_from_user:true,
      created_at:new Date().toISOString()
    };
    setMessages(prev=>[...prev,optimisticMessage]);

    // Client-side 30s timeout guard to prevent infinite thinking state
    let timedOut=false;
    const timeoutTimer=setTimeout(()=>{
      timedOut=true;
      setSending(false);
      setMessages(prev=>prev.filter(m=>m.id!==tempId));
      setFailedQuery(q);
      setError("HealthGuardian AI request timed out. Please try again.");
    },30000);

    try{
      const r=await chat.sendMessage({message:q,language});
      clearTimeout(timeoutTimer);
      if(timedOut)return;

      const data=r.data;
      const responseText=data.response||data.reply||"";

      setMessages(prev=>[
        ...prev.filter(m=>m.id!==tempId),
        {
          id:data.user_message_id||tempId,
          message:q,
          is_from_user:true,
          created_at:new Date().toISOString()
        },
        {
          id:data.ai_message_id||`ai-${Date.now()}`,
          message:responseText,
          is_from_user:false,
          intent:data.intent,
          provider:data.provider,
          emergency:data.emergency,
          safety_level:data.safety_level,
          resources:data.resources||[],
          created_at:new Date().toISOString()
        }
      ]);

      if(responseText){
        speakText(data.ai_message_id||`ai-${Date.now()}`,responseText);
      }
    }catch(err){
      clearTimeout(timeoutTimer);
      if(timedOut)return;
      setMessages(prev=>prev.filter(m=>m.id!==tempId));
      setFailedQuery(q);
      setError(err.response?.data?.detail||"HealthGuardian AI is temporarily unavailable. Please try again.");
    }finally{
      setSending(false);
    }
  };

  const speak=(id,text)=>{
    if(speakingId===id){
      stopSpeaking();
    }else{
      speakText(id,text);
    }
  };

  const suggestions=prompts[language]||prompts.English;
  return <><Navbar/><Page title="AI Health Companion" subtitle="Multilingual health education for symptoms, medicines, nutrition, exercise, meditation, sleep and preventive habits." action={
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full bg-teal-50 px-3 py-2 text-[10px] font-extrabold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 sm:inline">Female voice • {voiceReady?"Ready":"Browser voice"}</span>
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2"><Icon name="volume" size={14}/><span className="hidden text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:inline">Speed</span><select className="bg-transparent text-xs font-bold outline-none dark:text-white" value={rate} onChange={e=>setRate(Number(e.target.value))}><option value="0.6">Slow</option><option value="0.68">Normal-slow</option><option value="0.8">Normal</option></select></label>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2"><Icon name="globe" size={15}/><select className="bg-transparent text-xs font-bold outline-none dark:text-white" value={language} onChange={e=>setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Marathi</option></select></div>
    </div>
  }>
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card className="min-w-0" title={<span className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-teal-300"><Icon name="bot" size={18}/></span>HealthGuardian AI</span>} subtitle={`Responding in ${language}. Ask in English, Hindi or Marathi.`}>
        <div className="mb-4 flex flex-wrap gap-2">{suggestions.map(p=><button key={p} type="button" onClick={()=>send(p)} disabled={sending} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-400 dark:hover:text-teal-300 disabled:opacity-50">{p}</button>)}</div>
        <div className="flex h-[58vh] min-h-[470px] flex-col overflow-y-auto rounded-3xl bg-[#f4f8f8] dark:bg-slate-950 p-4 sm:p-6">
          {!messages.length&&!sending&&<div className="m-auto max-w-md text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-teal-300 shadow-lg"><Icon name="spark" size={28}/></div><h2 className="mt-4 text-xl font-black dark:text-white">How can I help today?</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Ask about symptoms, medicine information, healthy food, workouts, meditation, sleep or a report.</p></div>}
          {messages.map(m=><Message key={m.id} message={m} speak={speak} speakingId={speakingId}/>)}
          {sending&&<div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-teal-500"/>HealthGuardian is thinking...</div>}
          <div ref={bottomRef}/>
        </div>
        {error&&<div className="mt-3 flex items-center justify-between rounded-2xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300"><span>{error}</span>{failedQuery&&<button type="button" onClick={()=>send(failedQuery)} className="ml-3 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700">Retry</button>}</div>}
        <form onSubmit={e=>{e.preventDefault();send(input)}} className="mt-4 flex gap-2"><input className="input" value={input} onChange={e=>setInput(e.target.value)} placeholder={language==="Hindi"?"अपना स्वास्थ्य प्रश्न लिखें...":language==="Marathi"?"तुमचा आरोग्य प्रश्न लिहा...":"Ask your health question..."} disabled={sending}/><button className="btn-primary px-5" disabled={sending||!input.trim()}><Icon name="arrow" size={18}/></button></form>
        <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">AI responses are informational. For diagnosis, emergencies, prescriptions or treatment decisions, use qualified professional care.</p>
      </Card>
      <div className="space-y-5"><Card title="What the companion can do"><div className="space-y-3"><Capability icon="heart" title="Nutrition" text="Meal ideas and healthy food guidance."/><Capability icon="shield" title="Medicine education" text="General uses, precautions and questions to ask a pharmacist."/><Capability icon="pulse" title="Lifestyle" text="Exercise, sleep, hydration and meditation routines."/><Capability icon="file" title="Report context" text="Explain health information in simpler language."/></div></Card><Card title="Visual resources"><div className="space-y-3"><ResourceCard type="video" title="Hindi meditation videos" description="Open guided meditation resources in Hindi." url="https://www.youtube.com/results?search_query=hindi+guided+meditation"/><ResourceCard type="video" title="Marathi wellness videos" description="Open Marathi wellness and health resources." url="https://www.youtube.com/results?search_query=marathi+health+wellness"/></div></Card></div>
    </div>
  </Page></>
}
function Message({message,speak,speakingId}){
  const user=message.is_from_user;
  return <div className={`mb-4 flex ${user?"justify-end":"justify-start"}`}><div className={`max-w-[92%] ${user?"sm:max-w-[78%]":"sm:max-w-[88%]"}`}>
    <div className={`rounded-3xl px-4 py-3.5 text-sm leading-7 shadow-sm ${user?"rounded-br-md bg-slate-950 text-white":message.emergency?"rounded-bl-md border-2 border-red-500 bg-red-50/20 text-slate-800 dark:border-red-600 dark:bg-red-950/20 dark:text-slate-100":"rounded-bl-md border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}><div className="whitespace-pre-wrap">{formatDisplay(message.message)}</div></div>
    {!user&&<div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={()=>speak(message.id,message.message)} className="btn-secondary !rounded-xl !px-3 !py-1.5 text-[10px]">{speakingId===message.id?<><Icon name="stop" size={13}/>Stop</>:<><Icon name="volume" size={13}/>Read aloud</>}</button>{message.safety_level&&<span className={`badge ${message.safety_level==="high"?"bg-red-50 text-red-700":message.safety_level==="moderate"?"bg-amber-50 text-amber-700":"bg-teal-50 text-teal-700"}`}>{message.safety_level} safety</span>}{message.provider&&<span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize">{message.provider}</span>}</div>}
    {!user&&message.resources?.length>0&&<div className="mt-3 grid gap-3 sm:grid-cols-2">{message.resources.map((r,i)=><ResourceCard key={i} {...r}/>)}</div>}
  </div></div>
}
function formatDisplay(text=""){
  return text
    .replace(/^#{1,6}\s*/gm,"")
    .replace(/\*{1,3}/g,"")
    .replace(/_{1,3}/g,"")
    .replace(/`+/g,"")
    .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1")
    .replace(/^\s*[-*]\s+/gm,"• ")
    .replace(/[>|]/g," ")
    .trim();
}
function Capability({icon,title,text}){return <div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"><Icon name={icon} size={16}/></div><div><div className="text-xs font-extrabold dark:text-white">{title}</div><p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{text}</p></div></div>}
