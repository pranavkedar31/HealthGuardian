import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import { getLanguage, setLanguage } from "../utils/i18n";
import { getStoredTheme, applyTheme } from "../utils/theme";
import { listReminders } from "../api/reminders";

const groups = [
  {
    title: "Overview",
    links: [
      ["/dashboard", "Dashboard", "grid"],
      ["/centralized-records", "Centralized Records", "file"],
      ["/health-insights", "Health Insights", "spark"],
      ["/health-history", "Health Timeline", "activity"],
    ],
  },
  {
    title: "My Health",
    links: [
      ["/health-profile", "My Health", "heart"],
      ["/vitals", "Vitals & Trends", "pulse"],
      ["/symptom-checker", "Symptom Checker", "alert"],
      ["/appointments", "Appointments", "calendar"],
      ["/reports", "Medical Reports", "file"],
    ],
  },
  {
    title: "Wellness",
    links: [
      ["/diet-workout", "Diet & Workout", "heart"],
      ["/medicine-guide", "Medicine Guide", "shield"],
      ["/reminders", "Reminders", "bell"],
    ],
  },
  {
    title: "AI & Care Tools",
    links: [
      ["/health-connect", "Health Connect", "globe"],
      ["/chatbot", "AI Health Companion", "bot"],
    ],
  },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [language, setLang] = useState(getLanguage());
  const [theme, setTheme] = useState(getStoredTheme());

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reminders, setReminders] = useState([]);

  const nav = useNavigate();

  useEffect(() => {
    const onLang = (e) =>
      setLang(e.detail || getLanguage());

    window.addEventListener(
      "hg-language-change",
      onLang
    );

    return () =>
      window.removeEventListener(
        "hg-language-change",
        onLang
      );
  }, []);

  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail || getStoredTheme());
    window.addEventListener("hg-theme-change", onTheme);
    return () => window.removeEventListener("hg-theme-change", onTheme);
  }, []);

  // Load reminders for the notification bell
  useEffect(() => {
    if (!user || user.role !== "patient") {
      setReminders([]);
      return;
    }

    const loadReminders = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setReminders([]);
        return;
      }
      try {
        const response = await listReminders();
        setReminders(response.data || []);
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error(
            "Unable to load reminder notifications:",
            error
          );
        }
      }
    };

    loadReminders();

    // Refresh every 30 seconds
    const interval = setInterval(
      loadReminders,
      30000
    );

    return () => clearInterval(interval);
  }, [user]);

  const first =
    user?.full_name?.charAt(0)?.toUpperCase() || "U";

  const doLogout = () => {
    logout();
    nav("/login");
  };

  const activeReminders = reminders.filter(
    (reminder) => reminder.is_active
  );

  const formatTime = (time) => {
    if (!time) return "";

    const parts = time.split(":");
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${String(
      minute
    ).padStart(2, "0")} ${suffix}`;
  };

  return (
    <>
      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[292px] transform border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">

          <div className="flex items-center gap-3 px-6 py-6">
            <div className="brand-mark">
              <Icon name="shield" size={23} />
            </div>

            <div>
              <div className="brand-title text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Health
                <span className="text-teal-600 dark:text-teal-400">
                  Guardian
                </span>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400 dark:text-slate-500">
                AI preventive care
              </div>
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <span className="badge bg-teal-400/15 text-teal-200">
                AI companion
              </span>

              <Icon name="spark" size={16} />
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-300">
              Ask about symptoms, food, medicines,
              exercise, meditation or everyday health.
            </p>

            <button
              onClick={() => {
                setOpen(false);
                nav("/chatbot");
              }}
              className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold hover:bg-white/15"
            >
              Open AI assistant
              <Icon name="arrow" size={15} />
            </button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="px-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                  {g.title}
                </div>

                <div className="mt-2 space-y-1">
                  {g.links.map(
                    ([to, label, icon]) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() =>
                          setOpen(false)
                        }
                        className={({ isActive }) =>
                          `nav-item ${
                            isActive
                              ? "nav-item-active"
                              : ""
                          }`
                        }
                      >
                        <Icon
                          name={icon}
                          size={18}
                        />

                        <span>{label}</span>

                        {label ===
                          "AI Health Companion" && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-teal-500" />
                        )}
                      </NavLink>
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <button
              onClick={doLogout}
              className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <div className="avatar">{first}</div>

              <div className="min-w-0 flex-1">
                <div className="user-name truncate text-sm font-bold text-slate-800 dark:text-white">
                  {user?.full_name || "User"}
                </div>

                <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                  {user?.email ||
                    "Personal account"}
                </div>
              </div>

              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* TOP NAVBAR */}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/90 lg:ml-72">
        <div className="flex h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">

          <button
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="hidden sm:block">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-700 dark:text-teal-400">
              Personal health workspace
            </p>

            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Prevention • monitoring • guidance
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">

            {/* THEME SELECTOR (LIGHT / DARK) */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  applyTheme("light");
                  setTheme("light");
                }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  theme === "light"
                    ? "bg-white text-teal-800 shadow-sm dark:bg-slate-700 dark:text-teal-300"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
                title="Activate Light Mode"
                aria-label="Activate Light Mode"
              >
                <Icon name="sun" size={13} />
                <span className="hidden sm:inline">Light</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  applyTheme("dark");
                  setTheme("dark");
                }}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  theme === "dark"
                    ? "bg-slate-950 text-teal-300 shadow-sm dark:bg-teal-950 dark:text-teal-200"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
                title="Activate Dark Mode"
                aria-label="Activate Dark Mode"
              >
                <Icon name="moon" size={13} />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            {/* LANGUAGE */}

            <label className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:flex">
              <Icon name="globe" size={14} />

              <select
                aria-label="Language"
                className="bg-transparent text-xs font-bold outline-none dark:text-slate-200"
                value={language}
                onChange={(e) => {
                  setLang(e.target.value);
                  setLanguage(e.target.value);
                }}
              >
                <option className="dark:bg-slate-800 dark:text-white">English</option>
                <option className="dark:bg-slate-800 dark:text-white">Hindi</option>
                <option className="dark:bg-slate-800 dark:text-white">Marathi</option>
              </select>
            </label>

            {/* NOTIFICATION BELL */}

            <div className="relative">

              <button
                onClick={() =>
                  setNotificationsOpen(
                    !notificationsOpen
                  )
                }
                className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                aria-label="Notifications"
              >
                <Icon
                  name="bell"
                  size={19}
                />

                {/* Show dot only when active reminders exist */}
                {activeReminders.length > 0 && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
                )}
              </button>

              {/* NOTIFICATION DROPDOWN */}

              {notificationsOpen && (
                <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">

                  <div className="flex items-center justify-between px-2 py-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white">
                        Notifications
                      </h3>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Your active health reminders
                      </p>
                    </div>

                    <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      {activeReminders.length}
                    </span>
                  </div>

                  {activeReminders.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                        <Icon
                          name="bell"
                          size={18}
                        />
                      </div>

                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        No active reminders
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        Your scheduled reminders will
                        appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">

                      {activeReminders.map(
                        (reminder) => (
                          <button
                            key={reminder.id}
                            onClick={() => {
                              setNotificationsOpen(
                                false
                              );
                              nav("/reminders");
                            }}
                            className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                              <Icon
                                name="bell"
                                size={17}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-extrabold text-slate-800 dark:text-white">
                                {reminder.medicine_name}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {reminder.dosage ||
                                  "Reminder"}
                              </p>

                              <p className="mt-1 text-[11px] font-bold text-teal-700 dark:text-teal-400">
                                {formatTime(
                                  reminder.reminder_time
                                )}
                              </p>
                            </div>
                          </button>
                        )
                      )}

                    </div>
                  )}

                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      nav("/reminders");
                    }}
                    className="mt-2 w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 transition"
                  >
                    View all reminders
                  </button>
                </div>
              )}
            </div>

            {/* SETTINGS */}

            <button
              onClick={() => nav("/settings")}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              title="Settings"
            >
              <Icon
                name="settings"
                size={18}
              />
            </button>

            {/* PROFILE */}

            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
              <div className="avatar">{first}</div>

              <div className="hidden md:block">
                <p className="user-name text-sm font-bold text-slate-800 dark:text-white">
                  {user?.full_name || "User"}
                </p>

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Personal account
                </p>
              </div>
            </div>

          </div>
        </div>
      </header>
    </>
  );
}