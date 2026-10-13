import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import Stat from "../components/Stat";
import { useAuth } from "../context/AuthContext";
import * as healthApi from "../api/health";
import * as reminderApi from "../api/reminders";
import * as doctorApi from "../api/doctors";
import * as apptApi from "../api/appointments";
import * as notifApi from "../api/notifications";
import * as authApi from "../api/auth";
import { bmiCategory, wellnessScore } from "../utils/format";

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

function getMapUrl(item) {
  const name = item?.hospital_name || (item?.full_name ? `Dr. ${item.full_name}` : "Hospital");
  const addressParts = [item?.address, item?.area, item?.city].filter(Boolean);
  const q = `${name}${addressParts.length ? ", " + addressParts.join(", ") : ""}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function Appointments() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);

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

  // Doctors and filter state
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("All");
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("All");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [availableAreas, setAvailableAreas] = useState([]);

  // Modals
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingConfirmation, setBookingConfirmation] = useState(null);
  const [viewingAppointment, setViewingAppointment] = useState(null);

  // Initial data load
  const loadCoreData = () => {
    Promise.allSettled([
      healthApi.getHealthProfile(),
      healthApi.getVitals(),
      reminderApi.listReminders(),
      apptApi.listAppointments(),
      notifApi.listNotifications(),
      doctorApi.getSpecializations(),
    ]).then(([p, v, r, a, n, s]) => {
      if (p.status === "fulfilled") setProfile(p.value.data);
      if (v.status === "fulfilled") setVitals(v.value.data || []);
      if (r.status === "fulfilled") setReminders(r.value.data || []);
      if (a.status === "fulfilled") setAppointments(a.value.data || []);
      if (n.status === "fulfilled") setNotifications(n.value.data || []);
      if (s.status === "fulfilled") setSpecializations(s.value.data || []);
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

  // Load doctors based on current location and active filters
  const loadDoctors = () => {
    setLoadingDoctors(true);
    const params = {
      city: location.city || undefined,
      area: selectedArea !== "All" ? selectedArea : undefined,
      pincode: location.pincode || undefined,
      latitude: location.latitude || undefined,
      longitude: location.longitude || undefined,
    };
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedSpecialization !== "All") params.specialization = selectedSpecialization;
    if (selectedAvailability !== "All") params.availability = selectedAvailability.toLowerCase();

    doctorApi
      .searchDoctors(params)
      .then((res) => {
        const list = res.data || [];
        setDoctors(list);
        if (list.length > 0) {
          setAvailableAreas((prev) => {
            const set = new Set(prev);
            list.forEach((d) => {
              if (d.area) set.add(d.area);
            });
            return Array.from(set);
          });
        }
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  };

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, selectedSpecialization, selectedArea, selectedAvailability, searchQuery]);

  // Vitals & score metrics
  const bmi = useMemo(
    () =>
      profile?.height_cm && profile?.weight_kg
        ? (Number(profile.weight_kg) / (Number(profile.height_cm) / 100) ** 2).toFixed(1)
        : null,
    [profile]
  );
  const score = wellnessScore({ profile, vitals });
  const latest = vitals[0];
  const cat = bmiCategory(bmi);

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
        title="Appointments"
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
            FIND A DOCTOR NEAR YOU (DEDICATED CORE SECTION)
        ======================================================== */}
        <section id="find-doctor-section" className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-black text-teal-800">
                <Icon name="spark" size={14} /> Local Healthcare Network
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
                Find a Doctor Near You
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Doctors prioritized by proximity to {location.area ? `${location.area}, ` : ""}{location.city || "your area"}.
              </p>
            </div>
            <button
              onClick={() => setShowLocationModal(true)}
              className="w-fit text-xs font-extrabold text-teal-700 hover:text-teal-800 underline underline-offset-4"
            >
              Change area or coordinates →
            </button>
          </div>

          {/* Search bar & Filter row */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctors by name, specialization, hospital, clinic, or area..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Dynamic Filter Chips */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Filters:
              </span>

              {/* Specializations Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedSpecialization("All")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedSpecialization === "All"
                      ? "bg-teal-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Doctors
                </button>
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpecialization(spec)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      selectedSpecialization === spec
                        ? "bg-teal-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              {/* Area Filter */}
              {availableAreas.length > 0 && (
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <span className="text-xs font-bold text-slate-400">Area:</span>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-teal-500"
                  >
                    <option value="All">All Areas</option>
                    {availableAreas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Availability Filter */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-xs font-bold text-slate-400">Availability:</span>
                {["All", "Today", "Tomorrow"].map((av) => (
                  <button
                    key={av}
                    onClick={() => setSelectedAvailability(av)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                      selectedAvailability === av
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Doctors Near You Grid */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Doctors Near You ({doctors.length})
              </span>
              {location.city && (
                <span className="text-xs font-semibold text-teal-800">
                  📍 Showing providers in & around {location.city}
                </span>
              )}
            </div>

            {loadingDoctors ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-400">
                Scanning local doctors near {location.area || location.city}...
              </div>
            ) : doctors.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="text-3xl mb-2">🩺</div>
                <div className="text-base font-black text-slate-800">
                  No doctors found matching this filter
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Try resetting the specialization or area filter, or search for another clinic or symptom.
                </p>
                <button
                  onClick={() => {
                    setSelectedSpecialization("All");
                    setSelectedArea("All");
                    setSelectedAvailability("All");
                    setSearchQuery("");
                  }}
                  className="mt-4 btn-primary !rounded-xl text-xs !py-2"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {doctors.map((doc) => (
                  <DoctorCard
                    key={doc.id}
                    doctor={doc}
                    onView={() => setSelectedDoctor(doc)}
                    onBook={() => setBookingDoctor(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================
            MY UPCOMING APPOINTMENTS & NOTIFICATIONS ROW
        ======================================================== */}
        <section className="mb-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          {/* My Upcoming Appointments */}
          <Card
            title="My Upcoming Appointments"
            subtitle="Live status synchronization with doctor confirmation."
            action={
              <button
                onClick={loadCoreData}
                className="text-xs font-black text-teal-700 hover:text-teal-800"
              >
                Refresh
              </button>
            }
          >
            <div className="space-y-3">
              {appointments.slice(0, 4).map((appt) => (
                <div
                  key={appt.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        {appt.doctor?.full_name || "Doctor"}
                      </span>
                      <span className={`badge border text-[11px] font-bold ${statusStyles[appt.status] || statusStyles.pending}`}>
                        {appt.status === "confirmed" ? "Confirmed ✓" : appt.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-teal-700">
                      {appt.doctor?.specialization || "Specialist"} · {appt.doctor?.hospital_name || "Hospital"}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>📅 {new Date(appt.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>⏰ {new Date(appt.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      {appt.doctor?.area && <span>📍 {appt.doctor.area}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                    <button
                      onClick={() => setViewingAppointment(appt)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 transition"
                    >
                      View
                    </button>
                    <a
                      href={getMapUrl(appt.doctor)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-extrabold text-teal-800 hover:bg-teal-100 transition"
                    >
                      📍 Map
                    </a>
                  </div>
                </div>
              ))}

              {!appointments.length && (
                <Empty text="No appointments booked yet. Discover local doctors above to schedule a visit." />
              )}
            </div>
          </Card>

          {/* Notifications Feed */}
          <Card
            title="Notifications"
            subtitle="Real-time appointment and reminder updates."
            action={
              notifications.some((n) => !n.is_read) && (
                <button
                  onClick={() => {
                    notifApi.markAllNotificationsRead().then(() => {
                      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
                    });
                  }}
                  className="text-xs font-black text-teal-700 hover:text-teal-800"
                >
                  Mark all read
                </button>
              )
            }
          >
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-3.5 transition ${
                    n.is_read
                      ? "border-slate-100 bg-white text-slate-600"
                      : "border-teal-200 bg-teal-50/50 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {n.type === "appointment" ? "📅" : n.type === "reminder" ? "🔔" : "🛡️"}
                      </span>
                      <span className="text-xs font-black">{n.title}</span>
                    </div>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{n.message}</p>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}

              {!notifications.length && (
                <Empty text="No notifications right now. System updates will show up here." />
              )}
            </div>
          </Card>
        </section>

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
                    <span className="badge bg-teal-50 text-teal-700">
                      {r.frequency || "daily"}
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
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="metric-card">
                <div className="text-xs text-slate-400">BMI</div>
                <div className="mt-1 text-xl font-black">{bmi || "—"}</div>
                <div className="mt-1 text-[10px] font-bold text-teal-700">
                  {cat.label}
                </div>
              </div>
              <div className="metric-card">
                <div className="text-xs text-slate-400">Active Reminders</div>
                <div className="mt-1 text-xl font-black">
                  {reminders.filter((r) => r.is_active !== false).length + upcomingAppointments.length}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">tracked</div>
              </div>
            </div>
          </Card>
        </section>

        {/* Vitals Stat Cards */}
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Heart rate"
            value={latest?.heart_rate ? `${latest.heart_rate} bpm` : "—"}
            note="Latest saved reading"
            icon={<Icon name="pulse" size={18} />}
          />
          <Stat
            label="Blood pressure"
            value={
              latest?.blood_pressure_systolic
                ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic || "—"}`
                : "—"
            }
            note="Latest saved reading"
            icon={<Icon name="activity" size={18} />}
          />
          <Stat
            label="SpO₂"
            value={latest?.spo2 ? `${latest.spo2}%` : "—"}
            note="Latest saved reading"
            icon={<Icon name="heart" size={18} />}
          />
          <Stat
            label="Profile status"
            value={profile ? "Ready" : "Setup"}
            note={profile ? "Personal health context saved" : "Add your baseline details"}
            icon={<Icon name="user" size={18} />}
          />
        </div>

        {/* Quick Actions & Today's Focus */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
          <Card title="Quick actions" subtitle="Jump directly to the tools you use most.">
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map(([to, title, desc, icon]) => (
                <Link key={to} to={to} className="group soft-row flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <Icon name={icon} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900">{title}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
                    <div className="mt-3 text-[11px] font-black text-teal-700">
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

      {/* ========================================================
          DOCTOR DETAIL MODAL
      ======================================================== */}
      {selectedDoctor && (
        <DoctorDetailModal
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onBook={() => {
            const doc = selectedDoctor;
            setSelectedDoctor(null);
            setBookingDoctor(doc);
          }}
        />
      )}

      {/* ========================================================
          APPOINTMENT BOOKING MODAL
      ======================================================== */}
      {bookingDoctor && (
        <BookAppointmentModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onSuccess={(confirmation) => {
            setBookingDoctor(null);
            setBookingConfirmation(confirmation);
            loadCoreData();
          }}
        />
      )}

      {/* ========================================================
          BOOKING CONFIRMATION MODAL (SECTION 8)
      ======================================================== */}
      {bookingConfirmation && (
        <BookingConfirmationModal
          confirmation={bookingConfirmation}
          onClose={() => setBookingConfirmation(null)}
        />
      )}

      {/* ========================================================
          VIEW APPOINTMENT MODAL
      ======================================================== */}
      {viewingAppointment && (
        <AppointmentDetailModal
          appointment={viewingAppointment}
          onClose={() => setViewingAppointment(null)}
          onCancelled={() => {
            setViewingAppointment(null);
            loadCoreData();
          }}
        />
      )}
    </>
  );
}

// ==========================================================
// SUBCOMPONENTS
// ==========================================================

function DoctorCard({ doctor, onView, onBook }) {
  const mapUrl = getMapUrl(doctor);

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-teal-200 dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-black text-lg">
              {doctor.full_name?.replace("Dr. ", "").charAt(0) || "D"}
            </div>
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white text-base leading-snug">
                {doctor.full_name}
              </div>
              <span className="inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                {doctor.specialization}
              </span>
            </div>
          </div>
          {doctor.distance_km !== null && doctor.distance_km !== undefined && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              📍 {doctor.distance_km} km away
            </span>
          )}
        </div>

        {/* Hospital & Location */}
        <div className="mt-3.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>🏥</span> {doctor.hospital_name}
          </div>
          <div className="text-slate-500 dark:text-slate-400 truncate">
            {doctor.address ? `${doctor.address}, ` : ""}
            {doctor.area}, {doctor.city}
          </div>
        </div>

        {/* Details: Experience & Slots */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {doctor.experience_years && (
            <div className="flex items-center justify-between">
              <span>Experience:</span>
              <span className="font-bold text-slate-800 dark:text-white">{doctor.experience_years} years</span>
            </div>
          )}
          {doctor.consultation_fee && (
            <div className="flex items-center justify-between">
              <span>Consultation fee:</span>
              <span className="font-bold text-teal-800 dark:text-teal-300">₹{doctor.consultation_fee}</span>
            </div>
          )}
          {doctor.available_slots_preview?.length > 0 && (
            <div className="rounded-xl bg-teal-50/50 p-2 text-[11px] font-semibold text-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
              <span className="font-bold">Available:</span> {doctor.available_slots_preview[0]}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-5 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onView}
          className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
        >
          View Doctor
        </button>
        <button
          onClick={onBook}
          className="rounded-xl bg-teal-700 dark:bg-teal-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800 dark:hover:bg-teal-500 transition"
        >
          Book
        </button>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
        >
          📍 Map
        </a>
      </div>
    </div>
  );
}

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
            const city = addr.city || addr.town || addr.village || addr.county || "";
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

// Doctor Details Modal
function DoctorDetailModal({ doctor, onClose, onBook }) {
  const mapUrl = getMapUrl(doctor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 text-xl font-black">
              {doctor.full_name?.replace("Dr. ", "").charAt(0) || "D"}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{doctor.full_name}</h3>
              <div className="text-xs font-extrabold text-teal-700 dark:text-teal-400">{doctor.specialization}</div>
              {doctor.qualification && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{doctor.qualification}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>

        {/* Clinic & Hospital info */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <span>🏥</span>
            <span>{doctor.hospital_name}</span>
          </div>
          <div className="text-slate-600 dark:text-slate-300">
            {doctor.address && `${doctor.address}, `}
            {doctor.area}, {doctor.city} - {doctor.pincode}
          </div>
          {doctor.distance_km !== null && doctor.distance_km !== undefined && (
            <div className="text-teal-800 dark:text-teal-300 font-bold">📍 Approx. {doctor.distance_km} km from your selected location</div>
          )}
        </div>

        {/* Schedule & Fee */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="metric-card">
            <span className="text-slate-400">Experience</span>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
              {doctor.experience_years ? `${doctor.experience_years} Years` : "Experienced"}
            </div>
          </div>
          <div className="metric-card">
            <span className="text-slate-400">Consultation Fee</span>
            <div className="text-sm font-black text-teal-800 dark:text-teal-300 mt-1">
              ₹{doctor.consultation_fee || "400"}
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="text-xs space-y-1">
          <span className="font-bold text-slate-700 dark:text-slate-300">Consultation Schedule:</span>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-slate-600 dark:text-slate-300">
            <div>Days: {doctor.available_days || "Mon - Sat"}</div>
            <div>Hours: {doctor.available_time_start || "09:00"} – {doctor.available_time_end || "18:00"}</div>
          </div>
        </div>

        {/* Bio */}
        {doctor.bio && (
          <div className="text-xs space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">About the Doctor:</span>
            <p className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-slate-600 dark:text-slate-300 leading-relaxed">{doctor.bio}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span>📍 View on Map</span>
          </a>
          <button
            onClick={onBook}
            className="btn-primary !rounded-xl !py-2.5 text-xs font-bold"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

// Appointment Booking Modal
function BookAppointmentModal({ doctor, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError("");

    doctorApi
      .getAvailableSlots(doctor.id, selectedDate)
      .then((res) => setSlots(res.data || []))
      .catch((err) => {
        setSlots([]);
        setError(err.response?.data?.detail || "Could not fetch slots for this date.");
      })
      .finally(() => setLoadingSlots(false));
  }, [doctor.id, selectedDate]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError("Please select an available appointment time slot.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const res = await apptApi.createAppointment({
        doctor_id: doctor.id,
        scheduled_at: selectedSlot.datetime_iso,
        reason: reason.trim() || "General Consultation",
      });

      onSuccess({
        doctor,
        appointment: res.data,
        formattedDate: new Date(selectedSlot.datetime_iso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        formattedTime: selectedSlot.slot_time,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Booking failed. Slot may have been taken.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Book Appointment
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{doctor.full_name}</h3>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {doctor.specialization} · {doctor.hospital_name}
            </div>
            <div className="text-[11px] text-slate-400">📍 {doctor.area}, {doctor.city}</div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleBooking} className="space-y-4">
          {/* Date Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Date:
            </label>
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="input text-xs w-full"
            />
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Available Time Slot:
            </label>
            {loadingSlots ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                Checking doctor availability...
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                No slots available on this date. Doctor may be off or fully booked.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {slots.map((slot) => (
                  <button
                    key={slot.datetime_iso}
                    type="button"
                    disabled={!slot.is_available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-xl border py-2 text-center text-xs font-bold transition ${
                      !slot.is_available
                        ? "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed line-through"
                        : selectedSlot?.datetime_iso === slot.datetime_iso
                        ? "border-teal-600 bg-teal-700 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
                    }`}
                  >
                    {slot.slot_time}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-[10px] text-slate-400">
              Only unreserved slots are shown. Double bookings are automatically prevented.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Visit:
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Follow-up consultation, symptom discussion, preventive screening..."
              className="input text-xs w-full resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !selectedSlot}
              className="btn-primary !rounded-xl !px-5 !py-2 text-xs font-bold disabled:opacity-50"
            >
              {busy ? "Confirming..." : "Confirm Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Booking Confirmation Modal (Section 8)
function BookingConfirmationModal({ confirmation, onClose }) {
  const { doctor, appointment, formattedDate, formattedTime } = confirmation;
  const mapUrl = getMapUrl(doctor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl text-center space-y-4 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 text-2xl font-black shadow-inner">
          ✓
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Appointment Booked Successfully ✓
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Your appointment has been recorded and submitted to the doctor for confirmation.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/80 p-4 text-left space-y-2 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Doctor:</span>
            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{doctor.full_name}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Specialization:</span>
            <div className="font-bold text-teal-800 dark:text-teal-300">{doctor.specialization}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Hospital:</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">{doctor.hospital_name}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Location:</span>
            <div className="text-slate-600 dark:text-slate-300">{doctor.area}, {doctor.city}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Date:</span>
              <div className="font-bold text-slate-800 dark:text-slate-200">{formattedDate}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Time:</span>
              <div className="font-bold text-slate-800 dark:text-slate-200">{formattedTime}</div>
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
            <div>
              <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                {appointment.status || "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <span>📍 View Hospital Location</span>
          </a>
          <button
            onClick={onClose}
            className="btn-primary !rounded-2xl !py-3 text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// View Appointment Modal
function AppointmentDetailModal({ appointment, onClose, onCancelled }) {
  const [cancelling, setCancelling] = useState(false);
  const mapUrl = getMapUrl(appointment.doctor);

  const cancelAppt = async () => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    setCancelling(true);
    try {
      await apptApi.updateAppointment(appointment.id, { status: "cancelled" });
      onCancelled();
    } catch (e) {
      alert("Unable to cancel appointment.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Appointment Details
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{appointment.doctor?.full_name || "Doctor"}</h3>
            <div className="text-xs font-bold text-teal-700 dark:text-teal-400">{appointment.doctor?.specialization}</div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 space-y-2 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Hospital & Clinic:</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">{appointment.doctor?.hospital_name || "Clinic"}</div>
            <div className="text-slate-500 dark:text-slate-400">{appointment.doctor?.address || ""}, {appointment.doctor?.area || ""}, {appointment.doctor?.city || ""}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Scheduled Date:</span>
              <div className="font-bold text-slate-900 dark:text-white">{new Date(appointment.scheduled_at).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Scheduled Time:</span>
              <div className="font-bold text-slate-900 dark:text-white">{new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Reason:</span>
            <div className="text-slate-700 dark:text-slate-200">{appointment.reason || "General Consultation"}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Live Status:</span>
            <div>
              <span className={`badge border ${statusStyles[appointment.status] || statusStyles.pending}`}>
                {appointment.status === "confirmed" ? "Confirmed ✓" : appointment.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {appointment.status !== "cancelled" && appointment.status !== "completed" && (
            <button
              disabled={cancelling}
              onClick={cancelAppt}
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition"
            >
              {cancelling ? "Cancelling..." : "Cancel Appointment"}
            </button>
          )}
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            📍 View on Map
          </a>
        </div>
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
