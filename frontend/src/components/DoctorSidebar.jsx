import Icon from "./Icon";

export default function DoctorSidebar({
  activeView,
  setActiveView,
  statusFilter,
  setStatusFilter,
  stats,
  user,
  profile,
  loading = false,
  onLogout,
  mobileOpen,
  setMobileOpen,
}) {
  const initial = user?.full_name?.charAt(0)?.toUpperCase() || "D";

  const handleNav = (view, filter = null) => {
    setActiveView(view);
    if (filter !== null) {
      setStatusFilter(filter);
    }
    if (setMobileOpen) setMobileOpen(false);
  };

  const appointmentItems = [
    { id: "all", label: "All Appointments", count: loading ? "..." : (stats?.total ?? 0), color: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
    { id: "pending", label: "Pending", count: loading ? "..." : (stats?.pending ?? 0), color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300" },
    { id: "approved", label: "Approved", count: loading ? "..." : (stats?.approved ?? 0), color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" },
    { id: "rejected", label: "Rejected", count: loading ? "..." : (stats?.rejected ?? 0), color: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300" },
    { id: "canceled", label: "Canceled", count: loading ? "..." : (stats?.canceled ?? 0), color: "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
    { id: "completed", label: "Completed", count: loading ? "..." : (stats?.completed ?? 0), color: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300" },
  ];

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <Icon name="shield" size={22} />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Health<span className="text-teal-600 dark:text-teal-400">Guardian</span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700 dark:text-teal-400">
                Doctor Workspace
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
            {/* OVERVIEW SECTION */}
            <div>
              <div className="px-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
                Overview
              </div>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNav("dashboard")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeView === "dashboard"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon name="grid" size={17} />
                  <span>Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav("appointments", "all")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeView === "appointments" && statusFilter === "all"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon name="calendar" size={17} />
                  <span>Appointments</span>
                  <span className="ml-auto rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:text-slate-300">
                    {loading ? "..." : (stats?.total ?? 0)}
                  </span>
                </button>
              </div>
            </div>

            {/* APPOINTMENTS SECTION */}
            <div>
              <div className="px-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
                Appointments
              </div>
              <div className="mt-2 space-y-1">
                {appointmentItems.map((item) => {
                  const isActive =
                    (activeView === "appointments" || activeView === "dashboard") &&
                    statusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav("appointments", item.id)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
                        isActive
                          ? "bg-teal-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.id === "pending"
                              ? "bg-amber-500"
                              : item.id === "approved"
                              ? "bg-emerald-500"
                              : item.id === "rejected"
                              ? "bg-rose-500"
                              : item.id === "canceled"
                              ? "bg-slate-400"
                              : item.id === "completed"
                              ? "bg-teal-500"
                              : "bg-slate-300"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black transition ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.color
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACCOUNT SECTION */}
            <div>
              <div className="px-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
                Account
              </div>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNav("profile")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeView === "profile"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon name="user" size={17} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNav("settings")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
                    activeView === "settings"
                      ? "bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Icon name="settings" size={17} />
                  <span>Account Settings</span>
                </button>
              </div>
            </div>
          </nav>

          {/* User Account / Logout Footer */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-xs font-black text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                    {user?.full_name || "Doctor"}
                  </div>
                  <div className="truncate text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    {profile?.specialization || "Verified Doctor"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Logout"
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-slate-700 dark:hover:text-rose-400 transition"
              >
                <Icon name="logout" size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
