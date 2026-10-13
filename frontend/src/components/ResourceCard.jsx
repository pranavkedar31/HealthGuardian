import {useEffect,useState} from "react";
import Icon from "./Icon";
import {searchImage} from "../api/integrations";

export default function ResourceCard({title,description,url,type="video",image,searchQuery}){
  const [src,setSrc]=useState(image||null);
  const [loading,setLoading]=useState(!image&&!!searchQuery&&type==="image");
  useEffect(()=>{
    let alive=true;
    if(!image&&searchQuery&&type==="image"){
      setLoading(true);
      searchImage(searchQuery).then(r=>{if(alive)setSrc(r.data?.url||null)}).catch(()=>{}).finally(()=>{if(alive)setLoading(false)});
    }
    return()=>{alive=false};
  },[image,searchQuery,type]);
  const isVideo=type==="video";
  return <a href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/40">
    <div className="relative flex h-36 items-center justify-center overflow-hidden bg-slate-950">
      {src?<img src={src} alt="" className="h-full w-full object-cover" onError={()=>setSrc(null)}/>:<div className="flex flex-col items-center justify-center text-teal-200">{loading?<span className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-teal-300"/>:<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><Icon name={isVideo?"video":"image"} size={28}/></span>} {isVideo&&<span className="mt-2 text-[10px] font-bold text-white/70">Open educational video</span>}</div>}
      {isVideo&&<span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">Video</span>}
    </div>
    <div className="p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-teal-700 dark:text-teal-400"><Icon name={isVideo?"video":"image"} size={13}/>{isVideo?"Video / resource":"Image / reference"}</div><h3 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p><div className="mt-3 text-xs font-bold text-teal-700 dark:text-teal-400">{isVideo?"Watch resources →":"Open image reference →"}</div></div>
  </a>
}
