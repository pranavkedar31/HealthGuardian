import { useEffect, useRef, useState } from "react";

export function useSpeech(language = "English") {
  const [speakingId, setSpeakingId] = useState(null);
  const [rate, setRate] = useState(0.8);
  const [ready, setReady] = useState(false);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      const updateVoices = () => {
        const voices = synthRef.current?.getVoices?.() || [];
        setReady(voices.length > 0);
      };
      updateVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = updateVoices;
      }
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setSpeakingId(null);
  };

  const speakText = (id, text) => {
    if (!synthRef.current || !text) return;
    synthRef.current.cancel();

    // Clean markdown/symbols
    const clean = text
      .replace(/[#*_`~[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = rate;

    // Pick best voice for language
    const langCode =
      language === "Hindi"
        ? "hi-IN"
        : language === "Marathi"
        ? "mr-IN"
        : "en-US";
    utterance.lang = langCode;

    const voices = synthRef.current.getVoices?.() || [];
    const matchedVoice =
      voices.find((v) => v.lang === langCode || v.lang.startsWith(langCode.slice(0, 2))) ||
      voices.find((v) => v.lang.includes("en"));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      setSpeakingId(null);
    };

    setSpeakingId(id);
    synthRef.current.speak(utterance);
  };

  return {
    speakText,
    stopSpeaking,
    speakingId,
    rate,
    setRate,
    ready,
  };
}
