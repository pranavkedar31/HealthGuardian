import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api/reminders";
import { useAuth } from "../context/AuthContext";

/**
 * Flexible time parser supporting "09:35", "9:35", "9.35", "09.35", "09:35:00", "9:35 AM/PM"
 * Returns minutes from midnight (0..1439) or null if invalid.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const isPM = /pm$/i.test(clean);
  const isAM = /am$/i.test(clean);
  const raw = clean.replace(/\s*(am|pm)$/i, "").replace(".", ":");
  const parts = raw.split(":");
  if (parts.length < 2) return null;
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Audio Alarm Engine
 * Generates continuous, rhythmic double-beep alarms using the Web Audio API.
 * Keeps beeping until explicitly stopped by the user.
 */
class AlarmSoundEngine {
  constructor() {
    this.ctx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  ensureContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    } catch (err) {
      console.warn("AudioContext initialization warning:", err);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.ensureContext();

    const triggerTone = () => {
      if (!this.isPlaying) return;
      try {
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Beep 1 (880 Hz, A5 tone)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.16);

        // Beep 2 (1046.5 Hz, C6 tone)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1046.5, now + 0.2);
        gain2.gain.setValueAtTime(0.22, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.42);
      } catch (e) {
        // Browser autoplay or background policy handled safely
      }
    };

    // Play immediately and repeat every 1 second continuously until stopped
    triggerTone();
    this.intervalId = setInterval(triggerTone, 1000);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx && this.ctx.state === "running") {
      try {
        this.ctx.suspend();
      } catch (e) {
        // ignore audio suspend error
      }
    }
  }
}

const alarmEngine = new AlarmSoundEngine();

export default function GlobalAlarm() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const activeAlarmRef = useRef(null);

  activeAlarmRef.current = activeAlarm;

  // Unlock AudioContext on initial user gesture anywhere on the window
  useEffect(() => {
    const unlock = () => {
      alarmEngine.ensureContext();
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const loadReminders = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !user || user.role !== "patient") {
      setReminders([]);
      return;
    }
    try {
      const res = await api.listReminders();
      setReminders(res.data || []);
    } catch (e) {
      // ignore
    }
  }, [user]);

  // Load reminders on mount, on user change, and listen for real-time app update events
  useEffect(() => {
    if (!user || user.role !== "patient") {
      setReminders([]);
      return;
    }

    loadReminders();

    const handleUpdate = () => {
      loadReminders();
    };

    const handleTestAlarm = (e) => {
      const sample = e.detail || {
        id: "preview-test",
        medicine_name: "Test Medication (Preview)",
        dosage: "1 Tablet / Continuous Sound Test",
        reminder_time: "Now",
        is_active: true,
      };
      setIsMuted(false);
      setActiveAlarm(sample);
    };

    window.addEventListener("healthguardian-reminders-updated", handleUpdate);
    window.addEventListener("healthguardian-test-alarm-trigger", handleTestAlarm);
    window.addEventListener("storage", handleUpdate);

    // Also poll every 10 seconds in case another device or server worker changed status
    const pollInterval = setInterval(loadReminders, 10000);

    return () => {
      window.removeEventListener("healthguardian-reminders-updated", handleUpdate);
      window.removeEventListener("healthguardian-test-alarm-trigger", handleTestAlarm);
      window.removeEventListener("storage", handleUpdate);
      clearInterval(pollInterval);
    };
  }, [user, loadReminders]);

  // Manage continuous audio beeping when activeAlarm changes
  useEffect(() => {
    if (activeAlarm && !isMuted) {
      alarmEngine.start();
    } else {
      alarmEngine.stop();
    }

    return () => {
      alarmEngine.stop();
    };
  }, [activeAlarm, isMuted]);

  // High-precision clock checker: runs every 1 second against system real-time
  useEffect(() => {
    if (!user || user.role !== "patient") return;

    const check = () => {
      if (activeAlarmRef.current) return; // Alarm is already ringing

      const now = new Date();
      const curHour = now.getHours();
      const curMin = now.getMinutes();
      const curMins = curHour * 60 + curMin;
      const today = now.toDateString();

      for (const r of reminders) {
        if (!r.is_active) continue;

        // If completed today, do not sound again
        if (r.completed_at) {
          const compDate = new Date(r.completed_at).toDateString();
          if (compDate === today) continue;
        }

        const remMins = parseTimeToMinutes(r.reminder_time);
        if (remMins === null) continue;

        const diff = curMins - remMins;

        // Trigger if current minute matches or within a 15-minute active window
        if (diff >= 0 && diff <= 15) {
          const dismissKey = `hg-alarm-dismissed-${r.id}-${today}`;
          const dismissedUntil = localStorage.getItem(dismissKey);

          if (dismissedUntil) {
            if (dismissedUntil === "forever") {
              continue;
            }
            const snoozeTimestamp = parseInt(dismissedUntil, 10);
            if (!isNaN(snoozeTimestamp) && snoozeTimestamp > now.getTime()) {
              continue; // Snooze still active
            }
          }

          // Trigger continuous alarm!
          setIsMuted(false);
          setActiveAlarm(r);

          // Native browser notification if permission granted
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`HealthGuardian: Time for ${r.medicine_name}! 💊`, {
                body: `${r.dosage || "Scheduled Medication Reminder"}\nScheduled for ${String(
                  Math.floor(remMins / 60)
                ).padStart(2, "0")}:${String(remMins % 60).padStart(2, "0")}`,
                icon: "/favicon.ico",
              });
            } catch (err) {
              // Notification fallback handled
            }
          }
          break;
        }
      }
    };

    check();
    const clockInterval = setInterval(check, 1000);
    return () => clearInterval(clockInterval);
  }, [user, reminders]);

  const handleTake = async () => {
    if (!activeAlarm) return;
    alarmEngine.stop();
    const alarmId = activeAlarm.id;
    const today = new Date().toDateString();

    try {
      await api.markReminderTaken(alarmId);
    } catch (e) {
      console.warn("Could not mark reminder taken on server:", e);
    }

    localStorage.setItem(`hg-alarm-dismissed-${alarmId}-${today}`, "forever");
    setActiveAlarm(null);
    loadReminders();
    window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
  };

  const handleSnooze = async () => {
    if (!activeAlarm) return;
    alarmEngine.stop();
    const alarmId = activeAlarm.id;
    const today = new Date().toDateString();
    const snoozeUntilTime = new Date().getTime() + 5 * 60000;

    localStorage.setItem(`hg-alarm-dismissed-${alarmId}-${today}`, snoozeUntilTime.toString());

    try {
      await api.snoozeReminder(alarmId, 5);
    } catch (e) {
      // server sync optional
    }

    setActiveAlarm(null);
    loadReminders();
    window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
  };

  const handleDismiss = () => {
    if (!activeAlarm) return;
    alarmEngine.stop();
    const alarmId = activeAlarm.id;
    const today = new Date().toDateString();

    localStorage.setItem(`hg-alarm-dismissed-${alarmId}-${today}`, "forever");
    setActiveAlarm(null);
  };

  if (!user || user.role !== "patient" || !activeAlarm) return null;

  const displayTime = activeAlarm.reminder_time
    ? String(activeAlarm.reminder_time).replace(".", ":").slice(0, 5)
    : "Now";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={() => alarmEngine.ensureContext()}
    >
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 border-4 border-teal-400 dark:bg-slate-900 dark:border-teal-500/80 ring-8 ring-teal-500/20">
        {/* Animated Alarm Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300 mb-1">
            <span className="absolute -inset-1 rounded-full bg-teal-400/40 animate-ping" />
            <span className="text-4xl animate-bounce">⏰</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/80 px-3 py-1 text-xs font-black text-rose-700 dark:text-rose-300 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-rose-600 dark:bg-rose-400" />
            Continuous Alarm Ringing
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white pt-1">
            {activeAlarm.medicine_name}
          </h3>

          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {activeAlarm.dosage || "Scheduled Dose"}
          </p>

          <div className="inline-block rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">
            Scheduled Time: {displayTime}
          </div>
        </div>

        {/* Alarm Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleTake}
            className="w-full rounded-2xl bg-teal-600 px-5 py-3.5 text-sm font-black text-white hover:bg-teal-700 active:scale-[0.98] transition shadow-lg shadow-teal-200 dark:shadow-none flex items-center justify-center gap-2"
          >
            <span>✓</span>
            <span>Mark as Taken & Stop Alarm</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSnooze}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            >
              ⏱️ Snooze (5m)
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            >
              ✕ Stop / Dismiss
            </button>
          </div>

          {/* Quick Mute Sound Toggle without closing popup */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline transition"
            >
              {isMuted ? "🔊 Resume Alarm Sound" : "🔇 Silence Audio (Keep Popup)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
