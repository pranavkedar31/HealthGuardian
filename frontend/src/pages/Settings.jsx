import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";
import { setLanguage } from "../utils/i18n";
import { applyTheme, resetToSystemDefault } from "../utils/theme";

export default function Settings() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [language, setLanguageState] = useState(
    localStorage.getItem("hg_language") || "English"
  );
  const [themeMode, setThemeMode] = useState(
    localStorage.getItem("hg_theme") || "system"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onTheme = () => {
      setThemeMode(localStorage.getItem("hg_theme") || "system");
    };
    window.addEventListener("hg-theme-change", onTheme);
    return () => window.removeEventListener("hg-theme-change", onTheme);
  }, []);

  const save = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        phone: phone,
      };
      // Only include full_name if not already set on user account
      if (!user?.full_name?.trim() && name.trim()) {
        payload.full_name = name.trim();
      }

      const r = await apiClient.put("/users/me", payload);

      setLanguage(language);
      setMessage(`Saved successfully. Welcome, ${r.data.full_name}.`);
    } catch (err) {
      setMessage(
        err.response?.data?.detail || "Unable to save settings."
      );
    }
  };

  return (
    <>
      <Navbar />

      <Page
        title="Settings"
        subtitle="Control your account details and preferred AI language."
        action={
          <div className="badge bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            <Icon name="settings" size={14} />
            Preferences
          </div>
        }
      >
        <div className="max-w-3xl">
          <Card
            title="Account & language"
            subtitle="Choose the language you understand best for AI guidance."
            accent
          >
            <form onSubmit={save} className="space-y-5">

              {/* Full Name */}
              {user?.full_name?.trim() ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="label mb-0">Full name</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>🔒</span> Verified / Locked
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white">
                    {user.full_name}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Icon name="shield" size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
                    This information cannot be changed after profile completion because it is used for personalized healthcare analysis.
                  </p>
                </div>
              ) : (
                <label>
                  <span className="label">Full name</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your legal full name"
                  />
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Note: Full name will be locked permanently once saved.
                  </p>
                </label>
              )}

              {/* Email */}
              <label>
                <span className="label">Email</span>

                <input
                  className="input bg-slate-50 dark:bg-slate-800/60 dark:text-slate-400"
                  value={user?.email || ""}
                  disabled
                />
              </label>

              {/* WhatsApp Number */}
              <label>
                <span className="label">WhatsApp Number</span>

                <input
                  className="input"
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Enter the WhatsApp number where you want to receive
                  medicine reminders.
                </p>
              </label>

              {/* Preferred Language */}
              <label>
                <span className="label">Preferred language</span>

                <select
                  className="input"
                  value={language}
                  onChange={(e) => {
                    setLanguageState(e.target.value);
                    setLanguage(e.target.value);
                  }}
                >
                  <option className="dark:bg-slate-900 dark:text-white">English</option>
                  <option className="dark:bg-slate-900 dark:text-white">Hindi</option>
                  <option className="dark:bg-slate-900 dark:text-white">Marathi</option>
                </select>
              </label>

              {/* Display Theme */}
              <label>
                <span className="label">Display Theme</span>

                <select
                  className="input"
                  value={themeMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setThemeMode(val);
                    if (val === "system") {
                      resetToSystemDefault();
                    } else {
                      applyTheme(val);
                    }
                  }}
                >
                  <option value="system" className="dark:bg-slate-900 dark:text-white">Screen Default (Match Device System)</option>
                  <option value="light" className="dark:bg-slate-900 dark:text-white">Light Mode</option>
                  <option value="dark" className="dark:bg-slate-900 dark:text-white">Dark Mode</option>
                </select>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Switch between Light, Dark, or automatically match your operating system screen default.
                </p>
              </label>

              {/* Save Button */}
              <button className="btn-primary">
                Save preferences
                <Icon name="check" size={16} />
              </button>

              {/* Success/Error Message */}
              {message && (
                <p className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  {message}
                </p>
              )}

            </form>
          </Card>
        </div>
      </Page>
    </>
  );
}