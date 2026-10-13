import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/reminders";

export default function Reminders() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const [form, setForm] = useState({
    medicine_name: "",
    dosage: "",
    reminder_time: "09:00",
    frequency: "daily",
    notification_method: "browser",
  });

  const [phone, setPhone] = useState(user?.phone || "");
  const [waHealth, setWaHealth] = useState(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testFeedback, setTestFeedback] = useState("");
  const [testError, setTestError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const load = () => {
    api
      .listReminders()
      .then((r) => setItems(r.data || []))
      .catch(() => {});
  };

  const loadWhatsAppHealth = () => {
    api
      .getWhatsAppHealth()
      .then((r) => setWaHealth(r.data))
      .catch(() => setWaHealth({ configured: false, status: "error", message: "Health check unavailable" }));
  };

  useEffect(() => {
    load();
    loadWhatsAppHealth();
  }, []);

  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user, phone]);

  const handleTestWhatsApp = async () => {
    const target = (phone || "").trim();
    if (!target) {
      setTestError("Please enter your WhatsApp phone number to test.");
      return;
    }

    setTestBusy(true);
    setTestFeedback("");
    setTestError("");

    try {
      const res = await api.testWhatsAppNotification(target);
      setTestFeedback(res.data?.message || "Test WhatsApp message sent successfully!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setTestError(
        typeof detail === "string"
          ? detail
          : "Unable to send WhatsApp message. Please check credentials or number format."
      );
    } finally {
      setTestBusy(false);
    }
  };

  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      setError("Your browser does not support desktop notifications.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Browser notification permission was not granted. Please enable notifications in site settings.");
      return false;
    }
    return true;
  };

function normalizeTimeInput(val) {
  if (!val) return "09:00:00";
  const clean = String(val).trim().replace(".", ":");
  const parts = clean.split(":");
  const h = parts[0] ? parts[0].padStart(2, "0") : "09";
  const m = parts[1] ? parts[1].padStart(2, "0") : "00";
  const s = parts[2] ? parts[2].padStart(2, "0") : "00";
  return `${h}:${m}:${s}`;
}

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMsg("");

    try {
      if (form.notification_method === "browser" || form.notification_method === "both") {
        const allowed = await enableBrowserNotifications();
        if (!allowed && form.notification_method === "browser") {
          setBusy(false);
          return;
        }
      }

      if (form.notification_method === "whatsapp" && !phone.trim()) {
        setError("Please enter your WhatsApp phone number.");
        setBusy(false);
        return;
      }

      const normalizedTime = normalizeTimeInput(form.reminder_time);

      await api.createReminder({
        ...form,
        phone_number: form.notification_method === "whatsapp" ? phone.trim() : undefined,
        reminder_time: normalizedTime,
      });

      setForm({
        medicine_name: "",
        dosage: "",
        reminder_time: "09:00",
        frequency: "daily",
        notification_method: "browser",
      });

      setSuccessMsg(`Reminder created successfully! Alarm scheduled for ${normalizedTime.slice(0, 5)}.`);
      load();
      window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Unable to create reminder. Please verify inputs."
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteReminder(id);
      load();
      window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
    } catch {
      setError("Unable to remove reminder.");
    }
  };

  const toggle = async (r) => {
    try {
      await api.updateReminder(r.id, {
        is_active: !r.is_active,
      });
      load();
      window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
    } catch {
      setError("Unable to update reminder.");
    }
  };

  const handleMarkTaken = async (id) => {
    try {
      await api.markReminderTaken(id);
      load();
      window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
    } catch {
      setError("Unable to mark reminder as taken.");
    }
  };

  const handleSnooze = async (id, minutes = 5) => {
    try {
      await api.snoozeReminder(id, minutes);
      load();
      window.dispatchEvent(new CustomEvent("healthguardian-reminders-updated"));
    } catch {
      setError("Unable to snooze reminder.");
    }
  };

  // Sync reminder list with global alarm changes in real-time
  useEffect(() => {
    const handleRemoteUpdate = () => {
      load();
    };
    window.addEventListener("healthguardian-reminders-updated", handleRemoteUpdate);
    return () => window.removeEventListener("healthguardian-reminders-updated", handleRemoteUpdate);
  }, []);

  return (
    <>
      <Navbar />

      <Page
        title="Medication & Health Reminders"
        subtitle="Schedule automated WhatsApp alerts and synchronized browser alarms for your medicines and daily health habits."
        action={
          <div className="flex items-center gap-2">
            <div className="badge bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Icon name="bell" size={14} />
              {items.filter((x) => x.is_active).length} active
            </div>
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
          {/* Create Reminder Form */}
          <Card
            title="Add a reminder"
            subtitle="Medication or recurring health routine."
            accent
            action={
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("healthguardian-test-alarm-trigger", {
                      detail: {
                        id: "preview-test",
                        medicine_name: form.medicine_name.trim() || "Sample Medicine",
                        dosage: form.dosage.trim() || "Continuous Alarm Sound Test",
                        reminder_time: form.reminder_time || "Now",
                        is_active: true,
                      },
                    })
                  );
                }}
                className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition flex items-center gap-1.5"
                title="Preview continuous alarm beeping sound and popup"
              >
                <span>🔔</span>
                <span>Test Alarm Sound</span>
              </button>
            }
          >
            <form onSubmit={submit} className="space-y-4">
              {successMsg && (
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  ✓ {successMsg}
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs font-bold text-rose-800 dark:text-rose-300">
                  ✕ {error}
                </div>
              )}

              <Field label="Medicine / Routine Name *">
                <input
                  className="input"
                  required
                  value={form.medicine_name}
                  onChange={(e) => setForm({ ...form, medicine_name: e.target.value })}
                  placeholder="e.g. Paracetamol 650mg or Drink Water"
                />
              </Field>

              <Field label="Dosage / Instruction">
                <input
                  className="input"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  placeholder="e.g. 1 tablet after food"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="label font-bold text-xs text-slate-700 dark:text-slate-300">
                      Reminder Time *
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const hh = String(now.getHours()).padStart(2, "0");
                        const mm = String(now.getMinutes()).padStart(2, "0");
                        setForm((prev) => ({ ...prev, reminder_time: `${hh}:${mm}` }));
                      }}
                      className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                      title="Set to current system clock time"
                    >
                      🕒 Set to Current Time
                    </button>
                  </div>
                  <input
                    className="input"
                    type="time"
                    required
                    value={form.reminder_time}
                    onChange={(e) => setForm({ ...form, reminder_time: e.target.value })}
                  />
                </div>

                <Field label="Frequency">
                  <select
                    className="input"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="once">Once</option>
                  </select>
                </Field>
              </div>

              {/* Notification Method Selector */}
              <div>
                <span className="label font-bold text-xs text-slate-700 dark:text-slate-300">
                  Notification Method
                </span>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, notification_method: "browser" })}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      form.notification_method === "browser"
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-700"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        <Icon name="bell" size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-black dark:text-white">Browser Alarm</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Audio + Popup</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, notification_method: "whatsapp" })}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      form.notification_method === "whatsapp"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-700"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="text-base">💬</span>
                      </div>
                      <div>
                        <div className="text-xs font-black dark:text-white">WhatsApp</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Direct Message</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* WhatsApp Config Card */}
              {form.notification_method === "whatsapp" && (
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                      WhatsApp Phone Number
                    </span>
                    {/* Dynamic Cloud API Status Badge */}
                    {waHealth?.configured && waHealth?.api_reachable ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Cloud API Active
                      </span>
                    ) : waHealth?.status === "token_expired" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> API Token Expired
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        API Unconfigured
                      </span>
                    )}
                  </div>

                  <input
                    type="tel"
                    className="input text-sm font-semibold dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                    placeholder="e.g. 9922248081 or +919922248081"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />

                  <p className="text-[11px] leading-4 text-emerald-800 dark:text-emerald-300/80">
                    Indian numbers (e.g. 9922248081) will be normalized into +91 automatically.
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={testBusy || !phone.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                    >
                      <span>💬</span>
                      <span>{testBusy ? "Sending test message..." : "Send Test WhatsApp Message"}</span>
                    </button>

                    {testFeedback && (
                      <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        ✓ {testFeedback}
                      </p>
                    )}

                    {testError && (
                      <div className="mt-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 p-2.5 text-xs text-rose-800 dark:text-rose-200 font-semibold space-y-1">
                        <div>✕ {testError}</div>
                        {testError.includes("expired") && (
                          <div className="text-[10px] text-rose-700 dark:text-rose-300">
                            Tip: Update WHATSAPP_ACCESS_TOKEN in backend/.env with a fresh token from Meta App Dashboard.
                          </div>
                        )}
                        {(testError.includes("allowed") || testError.includes("test list")) && (
                          <div className="text-[10px] text-rose-700 dark:text-rose-300 font-bold">
                            💡 Setup Tip: Meta requires test numbers to be registered. Go to Meta App Dashboard &rarr; WhatsApp &rarr; API Setup &rarr; in the &quot;To&quot; dropdown, click &quot;Manage phone number list&quot;, enter your phone number, and enter the OTP code.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button className="btn-primary w-full py-3.5" disabled={busy}>
                {busy ? "Scheduling..." : "Add Reminder"}
                <Icon name="plus" size={17} />
              </button>
            </form>
          </Card>

          {/* Reminders List & History */}
          <Card
            title="Your Medication Schedule"
            subtitle="Real-time reminders synchronized with local alarms and delivery tracking."
          >
            <div className="space-y-3">
              {items.map((r) => (
                <div
                  key={r.id}
                  className={`soft-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 ${
                    !r.is_active ? "opacity-50 bg-slate-50/50" : ""
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        r.notification_method === "whatsapp"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                      }`}
                    >
                      {r.notification_method === "whatsapp" ? (
                        <span className="text-xl">💬</span>
                      ) : (
                        <Icon name="bell" size={18} />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {r.medicine_name}
                        </span>
                        {r.delivery_status && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              r.delivery_status === "SENT"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : r.delivery_status === "FAILED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {r.delivery_status}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {r.dosage || "As advised"} · {r.frequency || "daily"}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>Method: {r.notification_method === "whatsapp" ? "WhatsApp" : "Browser Alarm"}</span>
                        {r.next_trigger_at && (
                          <span>· Next: {new Date(r.next_trigger_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Schedule Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left sm:text-right mr-2">
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {r.reminder_time.slice(0, 5)}
                      </div>
                      <div className="text-[10px] font-bold">
                        {!r.is_active ? (
                          <span className="text-slate-400">Paused</span>
                        ) : r.completed_at && new Date(r.completed_at).toDateString() === new Date().toDateString() ? (
                          <span className="text-emerald-600 font-bold">✓ Taken Today</span>
                        ) : (
                          <span className="text-teal-600">Scheduled</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Mark Taken */}
                    {r.is_active && (
                      <button
                        type="button"
                        onClick={() => handleMarkTaken(r.id)}
                        title="Mark as Taken for today"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 transition"
                      >
                        ✓ Take
                      </button>
                    )}

                    {/* Quick Snooze */}
                    {r.is_active && (
                      <button
                        type="button"
                        onClick={() => handleSnooze(r.id, 5)}
                        title="Snooze for 5 minutes"
                        className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 transition"
                      >
                        ⏳ 5m
                      </button>
                    )}

                    {/* Toggle ON/OFF */}
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black transition ${
                        r.is_active
                          ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {r.is_active ? "ON" : "OFF"}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {!items.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
                  No medicine reminders scheduled yet. Add your first routine on the left.
                </div>
              )}
            </div>
          </Card>
        </div>
      </Page>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label font-bold text-xs text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}