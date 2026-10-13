import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DoctorSidebar from "../components/DoctorSidebar";
import DoctorHeader from "../components/DoctorHeader";
import Icon from "../components/Icon";
import * as api from "../api/appointments";
import * as authApi from "../api/auth";

// Status configuration and color schemes
const STATUS_CONFIG = {
  pending: {
    label: "PENDING",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  approved: {
    label: "APPROVED",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  confirmed: {
    label: "APPROVED",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "REJECTED",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  canceled: {
    label: "CANCELED",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  cancelled: {
    label: "CANCELED",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  completed: {
    label: "COMPLETED",
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    dot: "bg-teal-600",
  },
};

export default function DoctorDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const nav = useNavigate();

  // Navigation and filtering states
  const [activeView, setActiveView] = useState("dashboard"); // "dashboard", "appointments", "profile", "settings"
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "approved", "rejected", "canceled", "completed"
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    canceled: 0,
    completed: 0,
  });
  const [profile, setProfile] = useState(null);

  // Loading and feedback states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [busyActionId, setBusyActionId] = useState("");
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Profile edit form state
  const [profileForm, setProfileForm] = useState({
    phone: "",
    specialization: "",
    qualification: "",
    experience_years: 5,
    hospital_name: "",
    address: "",
    area: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    consultation_fee: 500,
    available_days: "Mon,Tue,Wed,Thu,Fri,Sat",
    available_time_start: "09:00",
    available_time_end: "18:00",
    bio: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password update form state
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [savingPw, setSavingPw] = useState(false);

  // Show temporary toast message
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Pre-fill edit modal with latest profile data
  const handleOpenEditModal = () => {
    if (profile) {
      setProfileForm({
        phone: profile.phone || user?.phone || "",
        specialization: profile.specialization || "General Physician",
        qualification: profile.qualification || "MBBS, MD",
        experience_years: profile.experience_years ?? 5,
        hospital_name: profile.hospital_name || "Healthcare Clinic",
        address: profile.address || "",
        area: profile.area || "Central",
        city: profile.city || "Nagpur",
        state: profile.state || "Maharashtra",
        pincode: profile.pincode || "440001",
        consultation_fee: profile.consultation_fee ?? 500,
        available_days: profile.available_days || "Mon,Tue,Wed,Thu,Fri,Sat",
        available_time_start: profile.available_time_start || "09:00",
        available_time_end: profile.available_time_end || "18:00",
        bio: profile.bio || "",
      });
    }
    setEditModalOpen(true);
  };

  // Load all doctor data from backend
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setLoadError(null);
    try {
      const [apptsRes, statsRes, profRes] = await Promise.all([
        api.listDoctorAppointments(),
        api.getDoctorStats(),
        api.getDoctorProfile(),
      ]);

      const items = apptsRes?.data || [];
      setAppointments(items);

      if (statsRes?.data && (statsRes.data.total > 0 || items.length === 0)) {
        setStats(statsRes.data);
      } else {
        // Fallback / auto-reconcile dynamically from appointment items
        const pending = items.filter((x) => (x.status || "").toLowerCase() === "pending").length;
        const approved = items.filter((x) => {
          const s = (x.status || "").toLowerCase();
          return s === "confirmed" || s === "approved";
        }).length;
        const rejected = items.filter((x) => (x.status || "").toLowerCase() === "rejected").length;
        const canceled = items.filter((x) => {
          const s = (x.status || "").toLowerCase();
          return s === "cancelled" || s === "canceled";
        }).length;
        const completed = items.filter((x) => (x.status || "").toLowerCase() === "completed").length;
        setStats({
          total: items.length,
          pending,
          approved,
          rejected,
          canceled,
          completed,
        });
      }

      if (profRes?.data) {
        setProfile(profRes.data);
        setProfileForm({
          phone: profRes.data.phone || "",
          specialization: profRes.data.specialization || "General Physician",
          qualification: profRes.data.qualification || "MBBS, MD",
          experience_years: profRes.data.experience_years ?? 5,
          hospital_name: profRes.data.hospital_name || "Healthcare Clinic",
          address: profRes.data.address || "",
          area: profRes.data.area || "Central",
          city: profRes.data.city || "Nagpur",
          state: profRes.data.state || "Maharashtra",
          pincode: profRes.data.pincode || "440001",
          consultation_fee: profRes.data.consultation_fee ?? 500,
          available_days: profRes.data.available_days || "Mon,Tue,Wed,Thu,Fri,Sat",
          available_time_start: profRes.data.available_time_start || "09:00",
          available_time_end: profRes.data.available_time_end || "18:00",
          bio: profRes.data.bio || "",
        });
      }

      if (isRefresh && refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to load doctor workspace data:", err);
      const errMsg = err.response?.data?.detail || "Unable to load doctor workspace data.";
      setLoadError(errMsg);
      showToast("error", errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  // Appointment Status Transition Handler
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    setBusyActionId(appointmentId);
    try {
      await api.updateDoctorAppointment(appointmentId, { status: newStatus });
      const actionVerb =
        newStatus === "approved" || newStatus === "confirmed"
          ? "approved"
          : newStatus === "rejected"
          ? "rejected"
          : newStatus === "completed"
          ? "marked as completed"
          : "canceled";
      showToast("success", `Appointment successfully ${actionVerb}.`);
      await loadData(false);
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to update appointment status.");
    } finally {
      setBusyActionId("");
    }
  };

  // Save Doctor Profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateDoctorProfile({
        ...profileForm,
        experience_years: Number(profileForm.experience_years) || 5,
        consultation_fee: Number(profileForm.consultation_fee) || 500,
      });
      setProfile(res.data);
      if (refreshUser) {
        await refreshUser();
      }
      setEditModalOpen(false);
      showToast("success", "Doctor practice profile updated successfully.");
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to update doctor profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle password update
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      showToast("error", "New passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      await authApi.updatePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      showToast("success", "Password updated successfully.");
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to change password. Verify your current password.");
    } finally {
      setSavingPw(false);
    }
  };

  // Filter appointments according to status tab and search query
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const st = (appt.status || "").toLowerCase();
      // Match status filter
      if (statusFilter === "pending" && st !== "pending") return false;
      if (statusFilter === "approved" && st !== "confirmed" && st !== "approved") return false;
      if (statusFilter === "rejected" && st !== "rejected") return false;
      if (statusFilter === "canceled" && st !== "cancelled" && st !== "canceled") return false;
      if (statusFilter === "completed" && st !== "completed") return false;

      // Match search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (appt.patient?.full_name || "").toLowerCase();
        const pPhone = (appt.patient?.phone || "").toLowerCase();
        const pEmail = (appt.patient?.email || "").toLowerCase();
        const reason = (appt.reason || "").toLowerCase();
        return pName.includes(q) || pPhone.includes(q) || pEmail.includes(q) || reason.includes(q);
      }
      return true;
    });
  }, [appointments, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* 1. Dedicated Doctor Sidebar */}
      <DoctorSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        stats={stats}
        user={user}
        profile={profile}
        loading={loading}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* 2. Dedicated Doctor Header */}
      <DoctorHeader
        user={user}
        profile={profile}
        loading={loading}
        onRefresh={() => loadData(true)}
        onOpenProfile={() => setActiveView("profile")}
        onLogout={handleLogout}
        onToggleMobile={() => setMobileOpen(!mobileOpen)}
        refreshing={refreshing}
      />

      {/* Main Clinical Content Area */}
      <main className="lg:ml-[280px] p-4 sm:p-6 lg:p-8 max-w-7xl">
        {/* Toast feedback banner */}
        {toast && (
          <div
            className={`mb-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-bold shadow-sm transition ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={toast.type === "success" ? "check" : "alert"} size={16} />
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Load error recovery banner */}
        {loadError && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Icon name="alert" size={16} />
              <span>Failed to load appointments: {loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition self-start sm:self-auto shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* VIEW 1: DASHBOARD / APPOINTMENTS OVERVIEW */}
        {(activeView === "dashboard" || activeView === "appointments") && (
          <div className="space-y-6">
            {/* Overview / Statistics Section (6 Dynamic KPI Cards) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-[.18em] text-slate-500">
                  Appointment Overview
                </h2>
                <span className="text-[11px] font-bold text-slate-400">
                  Real-time database statistics
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <KpiCard
                  label="Total Appointments"
                  count={stats.total}
                  loading={loading}
                  icon="calendar"
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                  color="teal"
                />
                <KpiCard
                  label="Pending"
                  count={stats.pending}
                  loading={loading}
                  icon="alert"
                  active={statusFilter === "pending"}
                  onClick={() => setStatusFilter("pending")}
                  color="amber"
                />
                <KpiCard
                  label="Approved"
                  count={stats.approved}
                  loading={loading}
                  icon="check"
                  active={statusFilter === "approved"}
                  onClick={() => setStatusFilter("approved")}
                  color="emerald"
                />
                <KpiCard
                  label="Rejected"
                  count={stats.rejected}
                  loading={loading}
                  icon="trash"
                  active={statusFilter === "rejected"}
                  onClick={() => setStatusFilter("rejected")}
                  color="rose"
                />
                <KpiCard
                  label="Canceled"
                  count={stats.canceled}
                  loading={loading}
                  icon="stop"
                  active={statusFilter === "canceled"}
                  onClick={() => setStatusFilter("canceled")}
                  color="slate"
                />
                <KpiCard
                  label="Completed"
                  count={stats.completed}
                  loading={loading}
                  icon="shield"
                  active={statusFilter === "completed"}
                  onClick={() => setStatusFilter("completed")}
                  color="blue"
                />
              </div>
            </div>

            {/* Appointment Management Section */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Appointment Management
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review incoming requests, manage consultation schedules, and track visit status.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="search" size={15} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search patient, phone, reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-xs font-semibold placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Tabs with Live Counts */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <FilterTab
                  label="All"
                  count={stats.total}
                  loading={loading}
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                />
                <FilterTab
                  label="Pending"
                  count={stats.pending}
                  loading={loading}
                  active={statusFilter === "pending"}
                  onClick={() => setStatusFilter("pending")}
                  color="amber"
                />
                <FilterTab
                  label="Approved"
                  count={stats.approved}
                  loading={loading}
                  active={statusFilter === "approved"}
                  onClick={() => setStatusFilter("approved")}
                  color="emerald"
                />
                <FilterTab
                  label="Rejected"
                  count={stats.rejected}
                  loading={loading}
                  active={statusFilter === "rejected"}
                  onClick={() => setStatusFilter("rejected")}
                  color="rose"
                />
                <FilterTab
                  label="Canceled"
                  count={stats.canceled}
                  loading={loading}
                  active={statusFilter === "canceled"}
                  onClick={() => setStatusFilter("canceled")}
                  color="slate"
                />
                <FilterTab
                  label="Completed"
                  count={stats.completed}
                  loading={loading}
                  active={statusFilter === "completed"}
                  onClick={() => setStatusFilter("completed")}
                  color="blue"
                />
              </div>

              {/* Appointments List / Table */}
              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="py-16 text-center text-xs font-bold text-slate-400">
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Loading appointments...
                  </div>
                ) : filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      busy={busyActionId === appt.id}
                      onApprove={() => handleUpdateStatus(appt.id, "approved")}
                      onReject={() => handleUpdateStatus(appt.id, "rejected")}
                      onComplete={() => handleUpdateStatus(appt.id, "completed")}
                      onCancel={() => handleUpdateStatus(appt.id, "canceled")}
                    />
                  ))
                ) : (
                  <EmptyState statusFilter={statusFilter} searchQuery={searchQuery} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DOCTOR ACCOUNT & PRACTICE PROFILE */}
        {activeView === "profile" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-2xl font-black text-white shadow-lg shadow-teal-700/20">
                    {user?.full_name?.charAt(0)?.toUpperCase() || "D"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {user?.full_name || "Doctor"}
                      </h2>
                      {profile?.verification_status === "approved" ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40 flex items-center gap-1">
                          <span>✓</span> Verified Doctor
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-700 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending Verification
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-1 dark:text-slate-400">
                      {profile?.specialization || "General Physician"} • {profile?.qualification || "MBBS, MD"} • {profile?.experience_years ?? 5} years experience
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition"
                >
                  <Icon name="settings" size={15} />
                  <span>Edit Practice Details</span>
                </button>
              </div>

              {/* Profile Details Grid */}
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <DetailBox label="Hospital / Clinic Name" value={profile?.hospital_name || "Not set"} icon="shield" />
                <DetailBox label="Specialization" value={profile?.specialization || "General Physician"} icon="heart" />
                <DetailBox label="Qualification" value={profile?.qualification || "MBBS, MD"} icon="file" />
                <DetailBox label="Medical Registration No." value={profile?.medical_registration_number || "Not specified"} icon="file" />
                <DetailBox label="Registration Council" value={profile?.medical_registration_council || "Maharashtra Medical Council"} icon="shield" />
                <DetailBox label="Verification Status" value={profile?.verification_status === "approved" ? "Approved / Verified" : "Pending Verification"} icon="check" />
                <DetailBox label="Consultation Fee" value={`₹ ${profile?.consultation_fee || 500}`} icon="pulse" />
                <DetailBox label="Available Timings" value={`${profile?.available_time_start || "09:00"} - ${profile?.available_time_end || "18:00"}`} icon="calendar" />
                <DetailBox label="Available Days" value={profile?.available_days || "Mon - Sat"} icon="calendar" />
                <DetailBox label="Clinic Address" value={profile?.address || "Main Road"} icon="globe" />
                <DetailBox label="City & Locality" value={`${profile?.area || "Central"}, ${profile?.city || "Nagpur"}`} icon="globe" />
                <DetailBox label="Pincode" value={profile?.pincode || "440001"} icon="globe" />
                <DetailBox label="Registered Email" value={user?.email || "Not set"} icon="user" />
                <DetailBox label="Contact Phone" value={profile?.phone || user?.phone || "Not set"} icon="user" />
                <DetailBox label="Account Role" value="Doctor / Healthcare Provider" icon="shield" />
              </div>

              {/* Bio Section */}
              <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-5 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Professional Bio
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {profile?.bio || "No professional biography added yet. Click 'Edit Practice Details' to add your clinical bio."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ACCOUNT SETTINGS */}
        {activeView === "settings" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Account Settings & Security
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage your credentials and security preferences.
              </p>

              <form onSubmit={handleSavePassword} className="mt-6 max-w-md space-y-4">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Current Password</span>
                  <input
                    type="password"
                    required
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">New Password (min 8 chars)</span>
                  <input
                    type="password"
                    minLength="8"
                    required
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</span>
                  <input
                    type="password"
                    minLength="8"
                    required
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:border-teal-500 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingPw}
                  className="rounded-2xl bg-teal-600 px-5 py-3 text-xs font-black text-white hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-50"
                >
                  {savingPw ? "Updating Password..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* EDIT PRACTICE PROFILE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Edit Practice Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update clinic information and consultation settings</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Phone Number</span>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Qualification</span>
                  <input
                    type="text"
                    required
                    value={profileForm.qualification}
                    onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Hospital / Clinic Name</span>
                  <input
                    type="text"
                    required
                    value={profileForm.hospital_name}
                    onChange={(e) => setProfileForm({ ...profileForm, hospital_name: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Consultation Fee (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={profileForm.consultation_fee}
                    onChange={(e) => setProfileForm({ ...profileForm, consultation_fee: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Clinic Address</span>
                <input
                  type="text"
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Area / Locality</span>
                  <input
                    type="text"
                    required
                    value={profileForm.area}
                    onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">City</span>
                  <input
                    type="text"
                    required
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Pincode</span>
                  <input
                    type="text"
                    required
                    value={profileForm.pincode}
                    onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Experience (Years)</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={profileForm.experience_years}
                    onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">Start Time</span>
                  <input
                    type="time"
                    value={profileForm.available_time_start}
                    onChange={(e) => setProfileForm({ ...profileForm, available_time_start: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-slate-700 mb-1">End Time</span>
                  <input
                    type="time"
                    value={profileForm.available_time_end}
                    onChange={(e) => setProfileForm({ ...profileForm, available_time_end: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Professional Bio</span>
                <textarea
                  rows="3"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 p-2.5 text-xs font-semibold resize-none"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-2xl bg-teal-600 px-5 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Practice Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// KPI Statistic Card Component
function KpiCard({ label, count, icon, active, onClick, color, loading }) {
  const colorMap = {
    teal: "text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40",
    amber: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    rose: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
    slate: "text-slate-700 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    blue: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col justify-between rounded-3xl border p-4 text-left transition ${
        active
          ? "border-teal-600 bg-teal-50/40 shadow-sm ring-2 ring-teal-600/20 dark:bg-teal-950/30 dark:border-teal-500"
          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${colorMap[color]}`}>
          <Icon name={icon} size={14} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
        {loading ? (
          <span className="inline-block h-7 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        ) : (
          count
        )}
      </div>
    </button>
  );
}

// Filter Tab Component with Dynamic Badge
function FilterTab({ label, count, active, onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm dark:bg-teal-600 dark:text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
          active
            ? "bg-white/20 text-white"
            : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300"
        }`}
      >
        {loading ? "..." : count}
      </span>
    </button>
  );
}

// Single Appointment Card with Normalized Terminology & Strict Action Buttons
function AppointmentCard({ appointment, busy, onApprove, onReject, onComplete, onCancel }) {
  const patient = appointment.patient;
  const pName = patient?.full_name || "Patient";
  const pInitial = pName.charAt(0).toUpperCase();
  const rawStatus = (appointment.status || "pending").toLowerCase();
  const cfg = STATUS_CONFIG[rawStatus] || STATUS_CONFIG.pending;

  const dateObj = new Date(appointment.scheduled_at);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const isPending = rawStatus === "pending";
  const isApproved = rawStatus === "confirmed" || rawStatus === "approved";
  const isRejected = rawStatus === "rejected";
  const isCanceled = rawStatus === "cancelled" || rawStatus === "canceled";
  const isCompleted = rawStatus === "completed";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
      {/* Patient & Appointment Details */}
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-sm font-black text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
          {pInitial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">{pName}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border} dark:bg-slate-800`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {/* Schedule & Contact Details */}
          <div className="mt-2 grid gap-1.5 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">📅</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{dateStr}</span>
              <span className="text-slate-400">at</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{timeStr}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">📞</span>
              {patient?.phone ? (
                <a href={`tel:${patient.phone}`} className="font-semibold text-teal-700 dark:text-teal-400 hover:underline">
                  {patient.phone}
                </a>
              ) : (
                <span className="text-slate-400">Phone not provided</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">✉️</span>
              {patient?.email ? (
                <a href={`mailto:${patient.email}`} className="font-semibold text-slate-600 dark:text-slate-300 hover:underline">
                  {patient.email}
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Reason:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {appointment.reason || "General Consultation"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons with Strict Transitions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 lg:border-t-0 lg:pt-0">
        {/* Actions for PENDING */}
        {isPending && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Icon name="check" size={14} />
              <span>Approve</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <span>Reject</span>
            </button>
          </>
        )}

        {/* Actions for APPROVED */}
        {isApproved && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="flex items-center gap-1 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50"
            >
              <Icon name="check" size={14} />
              <span>Mark Completed</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>Cancel</span>
            </button>
          </>
        )}

        {/* Terminal statuses show badge indicator only */}
        {isRejected && (
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
            Request Rejected
          </span>
        )}
        {isCanceled && (
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            Appointment Canceled
          </span>
        )}
        {isCompleted && (
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40">
            ✓ Consultation Completed
          </span>
        )}
      </div>
    </div>
  );
}

// Profile detail display box
function DetailBox({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        <Icon name={icon} size={14} />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 break-words">{value}</div>
    </div>
  );
}

// Empty state feedback
function EmptyState({ statusFilter, searchQuery }) {
  let message = "No appointments found.";
  if (searchQuery) {
    message = `No appointments matching "${searchQuery}".`;
  } else if (statusFilter === "pending") {
    message = "You don't have any pending appointments to review.";
  } else if (statusFilter === "approved") {
    message = "No approved appointments scheduled.";
  } else if (statusFilter === "rejected") {
    message = "No rejected appointments.";
  } else if (statusFilter === "canceled") {
    message = "No canceled appointments.";
  } else if (statusFilter === "completed") {
    message = "No completed consultations recorded.";
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
        <Icon name="calendar" size={22} />
      </div>
      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{message}</div>
      <p className="mt-1 text-xs text-slate-400">
        When patients book consultations with you, they will appear here.
      </p>
    </div>
  );
}
