import Icon from "./Icon";

export default function DoctorHeader({
  user,
  profile,
  loading = false,
  onRefresh,
  onOpenProfile,
  onLogout,
  onToggleMobile,
  refreshing,
}) {
  const initial = user?.full_name?.charAt(0)?.toUpperCase() || "D";
  const spec = profile?.specialization || "General Physician";
  const hosp = profile?.hospital_name || (loading ? "Loading practice..." : "Healthcare Clinic");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:bg-slate-900/95 dark:border-slate-800 lg:ml-[280px]">
      <div className="flex h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile hamburger & Workspace Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            onClick={onToggleMobile}
            aria-label="Toggle navigation"
          >
            <Icon name="menu" size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black uppercase tracking-[.14em] text-teal-700 dark:text-teal-400">
                Doctor Workspace
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-800 border border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/40">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                Live Practice
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Manage appointments and your professional account.
            </p>
          </div>
        </div>

        {/* Right: Actions, Doctor Info & Logout */}
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
            title="Refresh Appointments"
          >
            <span className={refreshing ? "animate-spin" : ""}>⟳</span>
            <span className="hidden md:inline">Refresh</span>
          </button>

          {/* Doctor Info Card */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5 pr-3 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-xs font-black text-white shadow-sm">
              {initial}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {user?.full_name || "Doctor"}
              </div>
              <div className="text-[10px] font-bold text-teal-700 dark:text-teal-300 leading-tight">
                {spec} • {hosp}
              </div>
            </div>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            title="Sign out of Doctor Workspace"
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40 transition"
          >
            <Icon name="logout" size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
