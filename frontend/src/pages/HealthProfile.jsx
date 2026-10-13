import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import * as healthApi from "../api/health";
import { bmiCategory } from "../utils/format";

const empty = {
  age: "",
  gender: "",
  date_of_birth: "",
  height_cm: "",
  weight_kg: "",
  blood_group: "",
  allergies: [],
  chronic_conditions: [],
  smoking: false,
  alcohol: false,
};

export default function HealthProfile() {
  const [form, setForm] = useState(empty);
  const [initialProfile, setInitialProfile] = useState(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    healthApi
      .getHealthProfile()
      .then((r) => {
        if (r.data) {
          setForm({ ...empty, ...r.data });
          setInitialProfile(r.data);
          setExists(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isLocked = useMemo(
    () => ({
      gender: Boolean(initialProfile?.gender && String(initialProfile.gender).trim()),
      blood_group: Boolean(initialProfile?.blood_group && String(initialProfile.blood_group).trim()),
      date_of_birth: Boolean(initialProfile?.date_of_birth && String(initialProfile.date_of_birth).trim()),
    }),
    [initialProfile]
  );

  const bmi = useMemo(
    () =>
      form.height_cm && form.weight_kg
        ? (Number(form.weight_kg) / (Number(form.height_cm) / 100) ** 2).toFixed(1)
        : null,
    [form.height_cm, form.weight_kg]
  );
  const cat = bmiCategory(bmi);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const listChange = (name, value) =>
    setForm((f) => ({
      ...f,
      [name]: value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      blood_group: form.blood_group ? form.blood_group.trim().toUpperCase() : null,
      gender: form.gender ? form.gender.trim() : null,
      date_of_birth: form.date_of_birth ? form.date_of_birth.trim() : null,
    };

    try {
      let res;
      if (exists) {
        res = await healthApi.updateHealthProfile(payload);
      } else {
        res = await healthApi.createHealthProfile(payload);
        setExists(true);
      }
      if (res?.data) {
        setForm((f) => ({ ...f, ...res.data }));
        setInitialProfile(res.data);
      }
      setMessage("Health profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <>
        <Navbar />
        <Page title="My Health">
          <div className="surface-card h-96 animate-pulse" />
        </Page>
      </>
    );

  return (
    <>
      <Navbar />
      <Page
        title="My Health"
        subtitle="Create a useful baseline for HealthGuardian. Your profile helps the dashboard, risk tools and AI assistant give more relevant guidance."
        action={
          <Link to="/health-insights" className="btn-secondary">
            <Icon name="spark" size={16} />
            View insights
          </Link>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[1.5fr_.65fr]">
          <Card
            title="Personal health profile"
            subtitle="Permanent demographics are secured once entered; physical measurements remain editable."
            accent
          >
            <form onSubmit={save} className="space-y-7">
              {/* Basics Section */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <Icon name="user" size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white">
                    Personal Identity & Basics
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Gender: Immutable once saved */}
                  {isLocked.gender ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="label mb-0">Gender</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <span>🔒</span> Locked
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold capitalize text-slate-900 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white">
                        {form.gender}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        🔒 This information cannot be changed after profile completion because it is used for personalized healthcare analysis.
                      </p>
                    </div>
                  ) : (
                    <Field label="Gender">
                      <select
                        className="input"
                        name="gender"
                        value={form.gender || ""}
                        onChange={change}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        ⚠️ Locked permanently once saved.
                      </p>
                    </Field>
                  )}

                  {/* Blood Group: Immutable once saved */}
                  {isLocked.blood_group ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="label mb-0">Blood group</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <span>🔒</span> Locked
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold text-red-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-red-400">
                        {form.blood_group}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        🔒 This information cannot be changed after profile completion because it is used for personalized healthcare analysis.
                      </p>
                    </div>
                  ) : (
                    <Field label="Blood group">
                      <input
                        className="input"
                        name="blood_group"
                        placeholder="e.g. O+, A+, B+, AB-"
                        value={form.blood_group || ""}
                        onChange={change}
                      >
                      </input>
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        ⚠️ Locked permanently once saved.
                      </p>
                    </Field>
                  )}

                  {/* Date of Birth: Immutable once saved */}
                  {isLocked.date_of_birth ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="label mb-0">Date of Birth</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          <span>🔒</span> Locked
                        </span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white">
                        {form.date_of_birth}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        🔒 This information cannot be changed after profile completion because it is used for personalized healthcare analysis.
                      </p>
                    </div>
                  ) : (
                    <Field label="Date of Birth">
                      <input
                        className="input"
                        name="date_of_birth"
                        type="date"
                        value={form.date_of_birth || ""}
                        onChange={change}
                      />
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        ⚠️ Locked permanently once saved.
                      </p>
                    </Field>
                  )}

                  {/* Age: Calculated or editable reference */}
                  <Field label="Age (Years)">
                    <input
                      className="input"
                      name="age"
                      type="number"
                      min="0"
                      max="130"
                      value={form.age || ""}
                      onChange={change}
                      placeholder="e.g. 28"
                    />
                  </Field>

                  {/* Height: Always editable */}
                  <Field label="Height (cm)">
                    <input
                      className="input"
                      name="height_cm"
                      type="number"
                      min="1"
                      max="300"
                      value={form.height_cm || ""}
                      onChange={change}
                      placeholder="e.g. 175"
                    />
                  </Field>

                  {/* Weight: Always editable */}
                  <Field label="Weight (kg)">
                    <input
                      className="input"
                      name="weight_kg"
                      type="number"
                      min="1"
                      max="500"
                      step="0.1"
                      value={form.weight_kg || ""}
                      onChange={change}
                      placeholder="e.g. 70.5"
                    />
                  </Field>
                </div>
              </section>

              {/* Health context Section: Always editable */}
              <section className="border-t border-slate-100 pt-6 dark:border-slate-800">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <Icon name="shield" size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white">
                    Health Context (Updateable Anytime)
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Allergies">
                    <input
                      className="input"
                      value={(form.allergies || []).join(", ")}
                      onChange={(e) => listChange("allergies", e.target.value)}
                      placeholder="e.g. peanuts, penicillin, dust"
                    />
                  </Field>

                  <Field label="Chronic conditions">
                    <input
                      className="input"
                      value={(form.chronic_conditions || []).join(", ")}
                      onChange={(e) => listChange("chronic_conditions", e.target.value)}
                      placeholder="e.g. asthma, diabetes, hypertension"
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      name="smoking"
                      checked={!!form.smoking}
                      onChange={change}
                    />
                    I smoke
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      name="alcohol"
                      checked={!!form.alcohol}
                      onChange={change}
                    />
                    I drink alcohol
                  </label>
                </div>
              </section>

              {/* Action Buttons & Messages */}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  {message && (
                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {message}
                    </p>
                  )}
                  {error && (
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}
                </div>

                <button className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : exists ? "Save health profile" : "Create health profile"}
                  <Icon name="check" size={17} />
                </button>
              </div>
            </form>
          </Card>

          {/* Sidebar Cards */}
          <div className="space-y-5">
            <Card title="BMI snapshot" subtitle="A screening measure, not a diagnosis.">
              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Current BMI
                </div>
                <div className="mt-2 text-5xl font-black">{bmi || "—"}</div>
                <div className="mt-3 inline-flex rounded-full bg-teal-400/15 px-3 py-1 text-xs font-bold text-teal-200">
                  {cat.label}
                </div>
              </div>
              {bmi && (
                <div className="mt-4 grid grid-cols-4 gap-1 text-center text-[9px] font-bold text-slate-400">
                  <span>Under</span>
                  <span>Healthy</span>
                  <span>Above</span>
                  <span>High</span>
                </div>
              )}
            </Card>

            <Card title="Clinical Profile Rules">
              <div className="space-y-3">
                <Reason
                  icon="shield"
                  text="Permanent identity fields (Gender, Blood Group, Date of Birth) are locked to maintain reliable clinical records and safety."
                />
                <Reason
                  icon="spark"
                  text="Physical metrics (Height, Weight) remain editable so your BMI and risk assessments are always accurate."
                />
                <Reason
                  icon="pulse"
                  text="Lifestyle information (Allergies, Conditions, Smoking) can be updated anytime as your health evolves."
                />
              </div>
            </Card>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <b className="text-amber-950 dark:text-amber-100">Medical safety notice:</b> Verified personal demographics cannot be altered directly to prevent misdiagnoses and contraindicated medication calculations.
            </div>
          </div>
        </div>
      </Page>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Reason({ icon, text }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
        <Icon name={icon} size={15} />
      </div>
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
