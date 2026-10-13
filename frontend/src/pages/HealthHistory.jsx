import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import * as health from "../api/health";
import * as reports from "../api/reports";
import { prettyDate } from "../utils/format";

export default function HealthHistory() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      health.getSymptomHistory(),
      health.getDietHistory(),
      health.getWorkoutHistory(),
      health.getVitals(),
      reports.getReportHistory(),
    ]).then(([s, d, w, v, r]) => {
      const out = [];

      if (s.status === "fulfilled") {
        (s.value.data || []).forEach((x) =>
          out.push({
            date: x.created_at,
            title: "Symptom check",
            text: x.predicted_condition || "Assessment completed",
            icon: "alert",
            tone: "amber",
          })
        );
      }

      if (r.status === "fulfilled") {
        (r.value.data || []).forEach((x) =>
          out.push({
            date: x.created_at,
            title: "Medical report",
            text: x.original_filename || "Report uploaded",
            icon: "file",
            tone: "blue",
          })
        );
      }

      if (d.status === "fulfilled") {
        (d.value.data || []).forEach((x) =>
          out.push({
            date: x.created_at,
            title: "Diet plan",
            text: "Generated new nutrition plan",
            icon: "heart",
            tone: "teal",
          })
        );
      }

      if (w.status === "fulfilled") {
        (w.value.data || []).forEach((x) =>
          out.push({
            date: x.created_at,
            title: "Workout plan",
            text: "Generated new activity plan",
            icon: "pulse",
            tone: "purple",
          })
        );
      }

      if (v.status === "fulfilled") {
        (v.value.data || []).forEach((x) => {
          const parts = [];
          if (x.heart_rate) parts.push(`${x.heart_rate} bpm (Heart)`);
          if (x.blood_pressure_systolic && x.blood_pressure_diastolic) {
            parts.push(`${x.blood_pressure_systolic}/${x.blood_pressure_diastolic} (BP)`);
          }
          if (x.blood_sugar) parts.push(`${x.blood_sugar} mg/dL (Sugar)`);
          if (x.spo2) parts.push(`${x.spo2}% (SpO₂)`);
          if (x.temperature) parts.push(`${x.temperature}°C (Temp)`);

          out.push({
            date: x.recorded_at,
            title: "Vital reading",
            text: parts.length > 0 ? parts.join(" • ") : "Empty reading",
            icon: "activity",
            tone: "sky",
          });
        });
      }

      out.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setEvents(out);
    });
  }, []);

  return (
    <>
      <Navbar />
      <Page
        title="Health Timeline"
        subtitle="A single timeline for the health activity available in your account."
        action={
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            {events.length > 0 ? events.length : "0"} events
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
          <Card
            title="Your health journey"
            subtitle="Recent activity across your HealthGuardian tools."
          >
            <div className="relative ml-2 border-l border-slate-200 dark:border-slate-800 pl-7">
              {events.map((e, i) => (
                <div key={`${e.title}-${i}`} className="relative pb-7 last:pb-1">
                  <div className="absolute -left-[43px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-teal-50 text-teal-700 dark:border-slate-900 dark:bg-teal-950 dark:text-teal-300 shadow-sm">
                    <Icon name={e.icon} size={14} />
                  </div>
                  <div className="soft-row">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-white">{e.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 font-medium">
                          {e.text}
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] text-slate-400 font-bold">
                        {prettyDate(e.date)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!events.length && (
                <div className="p-10 text-center text-xs text-slate-500">
                  Your timeline will fill as you use symptom checks, reports, plans and vitals.
                </div>
              )}
            </div>
          </Card>
          <div className="space-y-5">
            <Card title="What this timeline does">
              <div className="space-y-3">
                <Item icon="activity" text="Shows when you interacted with health tools." />
                <Item
                  icon="file"
                  text="Keeps report activity visible without opening every page."
                />
                <Item
                  icon="spark"
                  text="Creates context for your own conversations with the AI assistant."
                />
              </div>
            </Card>
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <div className="text-xs font-black uppercase tracking-widest text-teal-300">
                Keep building
              </div>
              <h3 className="mt-2 text-xl font-black">
                Your data becomes more useful over time.
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Regular, consistent entries make trends easier to understand.
              </p>
            </div>
          </div>
        </div>
      </Page>
    </>
  );
}

function Item({ icon, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        <Icon name={icon} size={15} />
      </div>
      <p className="text-xs leading-5 text-slate-500 font-medium">{text}</p>
    </div>
  );
}
