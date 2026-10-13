import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import * as healthApi from "../api/health";
import * as reminderApi from "../api/reminders";
import * as apptApi from "../api/appointments";
import * as authApi from "../api/auth";
import { wellnessScore } from "../utils/format";

const quickActions = [
  ["/symptom-checker", "Check symptoms", "Get a structured triage-style health insight.", "alert"],
  ["/chatbot", "Ask HealthGuardian AI", "Chat about food, medicine, exercise and more.", "bot"],
  ["/reports", "Analyze a report", "Upload a medical report for a plain-language summary.", "file"],
  ["/diet-workout", "Build a wellness plan", "Generate nutrition and activity routines.", "heart"],
];

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user?.role === "doctor") {
      nav("/doctor", { replace: true });
    } else if (user?.role === "admin") {
      nav("/admin", { replace: true });
    }
  }, [user, nav]);

  const [profile, setProfile] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Location state
  const [location, setLocation] = useState({
    city: user?.city || "Nagpur",
    area: user?.location_area || "",
    state: user?.state || "Maharashtra",
    pincode: user?.pincode || "440001",
    latitude: user?.latitude || 21.1463,
    longitude: user?.longitude || 79.0849,
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const locationManuallySet = useRef(false);

  // Initial data load
  const loadCoreData = () => {
    Promise.allSettled([
      healthApi.getHealthProfile(),
      healthApi.getVitals(),
      reminderApi.listReminders(),
      apptApi.listAppointments(),
    ]).then(([p, v, r, a]) => {
      if (p.status === "fulfilled") setProfile(p.value.data);
      if (v.status === "fulfilled") setVitals(v.value.data || []);
      if (r.status === "fulfilled") setReminders(r.value.data || []);
      if (a.status === "fulfilled") setAppointments(a.value.data || []);
    });
  };

  useEffect(() => {
    loadCoreData();
  }, []);

  // Sync location from user profile on load — skip if user already changed it via modal
  useEffect(() => {
    if (locationManuallySet.current) return;
    if (user && user.city) {
      setLocation({
        city: user.city,
        area: user.location_area || user.city,
        state: user.state || "",
        pincode: user.pincode || "",
        latitude: user.latitude,
        longitude: user.longitude,
      });
    } else if (user && !user.city) {
      // Auto-detect user's real location via IP if not yet configured in profile
      fetch("https://ipwho.is/")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success !== false && data.city) {
            const detected = {
              city: data.city,
              area: data.subregion || data.city,
              state: data.region || "",
              pincode: data.postal || "",
              latitude: data.latitude,
              longitude: data.longitude,
            };
            setLocation(detected);
            authApi
              .updateProfile({
                city: detected.city,
                location_area: detected.area,
                state: detected.state,
                pincode: detected.pincode,
                latitude: detected.latitude,
                longitude: detected.longitude,
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Vitals & score metrics
  const score = wellnessScore({ profile, vitals });
  const first = user?.full_name?.split(" ")[0] || "there";

  // Upcoming appointment reminders
  const upcomingAppointments = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === "confirmed" || a.status === "pending"
      ),
    [appointments]
  );

  return (
    <>
      <Navbar />
      <Page
        title={`Welcome, ${first}`}
        subtitle="Discover nearby healthcare providers, track upcoming local appointments, and maintain your preventive wellness baseline."
        action={
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-teal-400 hover:text-teal-800 transition"
          >
            <Icon name="location" size={16} className="text-teal-600" />
            <span>📍 Your Location:</span>
            <span className="font-extrabold text-slate-900">
              {location.area && location.area !== location.city ? `${location.area}, ` : ""}
              {location.city || "Detecting..."}
            </span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>
        }
      >
        {/* ========================================================

        {/* ========================================================

        {/* ========================================================
            MY REMINDERS SECTION (MEDICINE + APPOINTMENTS)
        ======================================================== */}
        <section className="mb-8">
          <Card
            title="My Reminders"
            subtitle="Medicine routines and upcoming appointment reminders."
            action={
              <Link to="/reminders" className="text-xs font-black text-teal-700 dark:text-teal-400 hover:underline">
                Manage all →
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Medicine Reminders */}
              {reminders.slice(0, 3).map((r) => (
                <div key={r.id} className="soft-row flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                        Medicine
                      </span>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {r.medicine_name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {r.dosage || "1 dose"} · {r.reminder_time}
                      </div>
                    </div>
                      <span className={`badge ${!r.is_active ? "bg-slate-50 text-slate-500" : r.last_notified_at && new Date(r.last_notified_at).toDateString() === new Date().toDateString() ? "bg-green-50 text-green-700" : parseInt(r.reminder_time.slice(0, 2)) * 60 + parseInt(r.reminder_time.slice(3, 5)) <= new Date().getHours() * 60 + new Date().getMinutes() ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                        {!r.is_active ? "paused" : r.last_notified_at && new Date(r.last_notified_at).toDateString() === new Date().toDateString() ? "taken today" : parseInt(r.reminder_time.slice(0, 2)) * 60 + parseInt(r.reminder_time.slice(3, 5)) <= new Date().getHours() * 60 + new Date().getMinutes() ? "due now" : "upcoming"}
                      </span>
                  </div>
                </div>
              ))}

              {/* Appointment Reminders */}
              {upcomingAppointments.slice(0, 3).map((a) => (
                <div key={a.id} className="soft-row flex flex-col justify-between border-teal-100 bg-teal-50/20 dark:border-teal-900/40 dark:bg-teal-950/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                        Appointment Reminder
                      </span>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {a.doctor?.full_name || "Doctor"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(a.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at{" "}
                        {new Date(a.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span className={`badge ${statusStyles[a.status] || statusStyles.pending}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    📍 {a.doctor?.hospital_name || "Hospital"}, {a.doctor?.area || ""}
                  </div>
                </div>
              ))}

              {!reminders.length && !upcomingAppointments.length && (
                <div className="col-span-full">
                  <Empty text="No active medicine or appointment reminders." />
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* ========================================================
            HEALTH PULSE & METRICS (EXISTING FEATURES PRESERVED)
        ======================================================== */}
        <section className="grid gap-5 xl:grid-cols-[1.55fr_.8fr]">
          <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-teal-200">
                <Icon name="spark" size={14} /> HealthGuardian Preventive Intelligence
              </div>
              <h2 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
                Understand your health. Build better habits.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                Track vitals, consult with local doctors in your area, and turn diagnostic reports into practical preventive guidance.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn-teal" to="/health-insights">
                  View health insights <Icon name="arrow" size={16} />
                </Link>
                <Link
                  className="btn-secondary border-white/10 bg-white/10 text-white hover:bg-white/15"
                  to="/health-profile"
                >
                  Update health profile
                </Link>
              </div>
            </div>
          </div>

          <Card
            title="Today's health pulse"
            subtitle="A quick snapshot based on your saved health profile."
          >
            <div className="flex items-center gap-5 rounded-2xl bg-slate-950 p-5 text-white">
              <div
                className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#2dd4bf ${score * 3.6}deg,#1e293b 0deg)`,
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-950">
                  <div className="text-center">
                    <div className="text-2xl font-black">{score}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400">
                      score
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-lg font-black">
                  {score >= 80
                    ? "Strong foundation"
                    : score >= 65
                    ? "Good starting point"
                    : "Let's build your baseline"}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  Keep recording regular vitals and follow up with local specialists for preventive checkups.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Link to="/reminders" className="metric-card hover:bg-slate-50 transition cursor-pointer block">
                <div className="text-xs text-slate-400">Active Reminders</div>
                <div className="mt-1 text-xl font-black">
                  {reminders.length + upcomingAppointments.length}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">tracked (Click to manage)</div>
              </Link>
            </div>
          </Card>
        </section>



        {/* Quick Actions & Today's Focus */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
          <Card title="Quick actions" subtitle="Jump directly to the tools you use most.">
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map(([to, title, desc, icon]) => (
                <Link key={to} to={to} className="group soft-row flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <Icon name={icon} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white">{title}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{desc}</p>
                    <div className="mt-3 text-[11px] font-black text-teal-700 dark:text-teal-400">
                      Open tool →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Today's focus" subtitle="Small actions that support prevention.">
            <div className="space-y-3">
              <Focus icon="water" title="Hydration" text="Keep water available throughout the day." />
              <Focus icon="pulse" title="Movement" text="Break up long sitting periods with light activity." />
              <Focus icon="moon" title="Sleep" text="Aim for a consistent sleep and wake routine." />
            </div>
            <Link
              to="/diet-workout"
              className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-xs font-bold text-white"
            >
              Build a personalized plan <Icon name="arrow" size={15} />
            </Link>
          </Card>
        </div>
      </Page>

      {/* ========================================================
          LOCATION MODAL
      ======================================================== */}
      {showLocationModal && (
        <LocationModal
          initialLocation={location}
          onClose={() => setShowLocationModal(false)}
          onSave={async (newLoc) => {
            locationManuallySet.current = true;
            setLocation(newLoc);
            try {
              await authApi.updateProfile({
                city: newLoc.city,
                location_area: newLoc.area,
                state: newLoc.state,
                pincode: newLoc.pincode,
                latitude: newLoc.latitude,
                longitude: newLoc.longitude,
              });
              refreshUser();
            } catch (e) {
              console.error("Failed to save location to profile:", e);
            }
            setShowLocationModal(false);
          }}
        />
      )}

    </>
  );
}

// ==========================================================
// SUBCOMPONENTS
// ==========================================================


// Location Modal
function LocationModal({ initialLocation, onClose, onSave }) {
  const [form, setForm] = useState({ ...initialLocation });
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    setGeoMsg("Detecting your live location...");

    const applyIpLocation = async () => {
      try {
        const res = await fetch("https://ipwho.is/");
        const data = await res.json();
        if (data && data.success !== false && data.city) {
          const detectedCity = data.city;
          const detectedArea = data.subregion || data.city;
          const detectedState = data.region || "";
          const detectedPostal = data.postal || "";
          const detectedLat = data.latitude;
          const detectedLon = data.longitude;

          const newForm = {
            ...form,
            city: detectedCity,
            area: detectedArea,
            state: detectedState,
            pincode: detectedPostal,
            latitude: detectedLat,
            longitude: detectedLon,
          };
          setForm(newForm);
          setGeoMsg(`🗺️ Live location detected: ${detectedArea}, ${detectedCity}`);
          setTimeout(() => onSave(newForm), 600);
          return true;
        }
      } catch (err) {
        console.warn("IP Geolocation fallback failed:", err);
      }
      return false;
    };

    if (navigator.geolocation) {
      let resolved = false;
      const timer = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          setGeoMsg("Device GPS timed out. Detecting location via network...");
          const ok = await applyIpLocation();
          if (!ok) {
            setGeoMsg("Could not detect automatically. Please enter your city/area below.");
          }
          setLocating(false);
        }
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setGeoMsg("GPS coordinates captured! Resolving locality...");

          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
            );
            const nomData = await nomRes.json();
            const addr = nomData.address || {};
            const rawStateDistrict = (addr.state_district || "").replace(/\s*District$/i, "");
            const city = addr.city || addr.town || addr.village || addr.city_district || rawStateDistrict || addr.county || "";
            const area = addr.suburb || addr.neighbourhood || addr.city_district || city;
            const state = addr.state || "";
            const pincode = addr.postcode || "";

            const newForm = {
              ...form,
              city: city || form.city,
              area: area || form.area,
              state: state || form.state,
              pincode: pincode || form.pincode,
              latitude: lat,
              longitude: lon,
            };

            setForm(newForm);
            setGeoMsg(`📍 Location detected: ${city}, ${state}`);
            setTimeout(() => onSave(newForm), 600);
          } catch (e) {
            const ok = await applyIpLocation();
            if (!ok) {
               setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
               setGeoMsg("GPS coordinates captured. You can adjust the city/area fields if needed.");
            }
          } finally {
            setLocating(false);
          }
        },
        async () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          setGeoMsg("Device GPS unavailable. Detecting location via network...");
          const ok = await applyIpLocation();
          if (!ok) {
            setGeoMsg("Could not detect automatically. Please enter your city/area below.");
          }
          setLocating(false);
        },
        { timeout: 3500, enableHighAccuracy: false }
      );
    } else {
      const ok = await applyIpLocation();
      if (!ok) {
        setGeoMsg("Could not detect automatically. Please enter your city/area below.");
      }
      setLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Your Location</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>

        {/* Optional Current Location Button */}
        <div className="rounded-2xl bg-teal-50/70 border border-teal-200 p-3.5 text-center dark:bg-teal-950/40 dark:border-teal-800/40">
          <button
            type="button"
            disabled={locating}
            onClick={handleUseCurrentLocation}
            className="btn-primary !rounded-xl w-full text-xs !py-2.5 flex items-center justify-center gap-2"
          >
            <span>🎯</span>
            <span>{locating ? "Detecting location..." : "Use My Current Location"}</span>
          </button>
          <p className="mt-2 text-[11px] text-teal-800 dark:text-teal-300">
            Automatically detects your live coordinates and area.
          </p>
          {geoMsg && <p className="mt-1 text-xs font-semibold text-teal-900 dark:text-teal-200">{geoMsg}</p>}
        </div>

        {/* Manual inputs */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">City *</span>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    city: val,
                    latitude:
                      val.trim().toLowerCase() === (initialLocation.city || "").trim().toLowerCase()
                        ? prev.latitude
                        : null,
                    longitude:
                      val.trim().toLowerCase() === (initialLocation.city || "").trim().toLowerCase()
                        ? prev.longitude
                        : null,
                  }));
                }}
                placeholder="e.g. Nagpur, Pune, Mumbai"
                className="input text-xs mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Area / Locality</span>
              <input
                type="text"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="e.g. Sitabuldi, Kothrud, Bandra"
                className="input text-xs mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">State</span>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="e.g. Maharashtra"
                className="input text-xs mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">Pincode</span>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                placeholder="e.g. 440001"
                className="input text-xs mt-1"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary !rounded-xl !px-5 !py-2 text-xs">
              Save Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Focus({ icon, title, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
        <Icon name={icon} size={17} />
      </div>
      <div>
        <div className="text-sm font-extrabold">{title}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
      {text}
    </div>
  );
}
