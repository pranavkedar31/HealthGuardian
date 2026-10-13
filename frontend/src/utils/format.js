export function initials(name="User"){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"U";}
export function prettyDate(value){if(!value)return "—";try{return new Date(value).toLocaleString(undefined,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return value;}}

// Convert AI/Markdown output into natural plain speech. This is deliberately
// stricter than the visual formatter so the browser never reads symbols such as
// ###, **, _, /, markdown links, or code fences aloud.
export function cleanSpeech(text=""){
  return String(text)
    .replace(/```[\s\S]*?```/g," ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g,"$1")
    .replace(/https?:\/\/\S+/gi," ")
    .replace(/^\s{0,3}#{1,6}\s*/gm,"")
    .replace(/[*_~`]+/g,"")
    .replace(/^\s*[-+•]\s+/gm,"")
    .replace(/^\s*\d+[.)]\s+/gm,"")
    .replace(/[|<>\\/]+/g," ")
    .replace(/\s*[:;]\s*/g,". ")
    .replace(/\.{2,}/g,".")
    .replace(/\s{2,}/g," ")
    .replace(/\n{2,}/g,". ")
    .trim();
}

export function splitSpeech(text="",maxChars=230){
  const clean=cleanSpeech(text);
  if(!clean)return [];
  const sentences=clean.match(/[^.!?।]+[.!?।]?/g)||[clean];
  const chunks=[]; let current="";
  for(const raw of sentences){
    const sentence=raw.trim(); if(!sentence)continue;
    if((current+" "+sentence).trim().length<=maxChars){current=(current?current+" ":"")+sentence;continue;}
    if(current)chunks.push(current);
    if(sentence.length<=maxChars){current=sentence;continue;}
    for(let i=0;i<sentence.length;i+=maxChars)chunks.push(sentence.slice(i,i+maxChars).trim());
    current="";
  }
  if(current)chunks.push(current);
  return chunks;
}

export function bmiCategory(bmi){if(!bmi)return {label:"Not available",tone:"slate"};const n=Number(bmi);if(n<18.5)return {label:"Below range",tone:"amber"};if(n<25)return {label:"Healthy range",tone:"teal"};if(n<30)return {label:"Above range",tone:"amber"};return {label:"High range",tone:"red"};}
export function wellnessScore({profile,vitals=[]}){let score=45;if(profile?.age)score+=8;if(profile?.height_cm&&profile?.weight_kg){const bmi=profile.weight_kg/((profile.height_cm/100)**2);score+=bmi>=18.5&&bmi<25?18:10;}if(profile?.smoking===false)score+=8;if(profile?.alcohol===false)score+=5;if(vitals.length)score+=8;return Math.min(98,Math.max(0,score));}
