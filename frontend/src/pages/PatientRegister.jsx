import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function PatientRegister() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirm_password: "",
    date_of_birth: "",
    gender: "Other",
    address: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    blood_group: "",
    allergies: "",
    medical_conditions: "",
    medications: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const { patientRegister } = useAuth();

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      await patientRegister({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        username: form.username.trim() || undefined,
        password: form.password,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
        emergency_contact_relationship: form.emergency_contact_relationship.trim() || undefined,
        blood_group: form.blood_group || undefined,
        allergies: form.allergies.trim() || undefined,
        medical_conditions: form.medical_conditions.trim() || undefined,
        medications: form.medications.trim() || undefined,
      });
      setCreatedSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(
        typeof msg === "string"
          ? msg
          : "Registration failed. Please review your information."
      );
    } finally {
      setBusy(false);
    }
  };

  if (createdSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[32px] bg-white dark:bg-slate-900 p-8 shadow-2xl text-center space-y-6 border border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Patient Account Created!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Your HealthGuardian patient portal is active. You can now log in to view your vitals, reminders, and health tools.
            </p>
          </div>
          <Link
            to="/patient/login"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-sm font-black text-white hover:bg-teal-700 transition"
          >
            <span>Continue to Patient Login</span>
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-10 text-slate-900 dark:text-white">
      <div className="max-w-4xl mx-auto rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="dark-scope bg-gradient-to-r from-teal-900 via-teal-950 to-slate-950 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10" data-theme-scope="dark">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/10 text-teal-300 text-xs font-bold mb-2">
              👤 PATIENT REGISTRATION
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Create Your Patient Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Set up your personal health dashboard for smart preventive tracking.
            </p>
          </div>
          <Link
            to="/patient/login"
            className="text-xs font-bold text-teal-300 hover:text-white border border-teal-500/30 px-3.5 py-2 rounded-xl transition"
          >
            Already have an account? Sign In
          </Link>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="p-6 sm:p-10 space-y-8">
          {error && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 text-xs font-semibold text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Section 1: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2">
              <span>1. Personal Information</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Full Name *
                </span>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Email Address *
                </span>
                <input
                  required
                  type="email"
                  placeholder="rahul@example.com"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Phone Number
                </span>
                <input
                  type="tel"
                  placeholder="9922248081"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Date of Birth
                  </span>
                  <input
                    type="date"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                    value={form.date_of_birth}
                    onChange={(e) => update("date_of_birth", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Gender
                  </span>
                  <select
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                    value={form.gender}
                    onChange={(e) => update("gender", e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Account Security */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
              2. Account Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Username (Optional)
                </span>
                <input
                  type="text"
                  placeholder="rahul_sharma"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Password * (Min 8 chars, 1 digit)
                </span>
                <input
                  required
                  type="password"
                  placeholder="********"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Confirm Password *
                </span>
                <input
                  required
                  type="password"
                  placeholder="********"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.confirm_password}
                  onChange={(e) => update("confirm_password", e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Section 3: Address & Emergency Contact */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
              3. Address & Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Residential Address
                </span>
                <input
                  type="text"
                  placeholder="Flat No, Building, Street"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  City
                </span>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Pincode
                </span>
                <input
                  type="text"
                  placeholder="411001"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Emergency Contact Name
                </span>
                <input
                  type="text"
                  placeholder="Contact Person Name"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.emergency_contact_name}
                  onChange={(e) => update("emergency_contact_name", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Emergency Phone
                </span>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.emergency_contact_phone}
                  onChange={(e) => update("emergency_contact_phone", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Relationship
                </span>
                <input
                  type="text"
                  placeholder="Spouse / Parent / Sibling"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.emergency_contact_relationship}
                  onChange={(e) => update("emergency_contact_relationship", e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Section 4: Optional Health Profile */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
              4. Optional Health Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Blood Group
                </span>
                <select
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.blood_group}
                  onChange={(e) => update("blood_group", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Known Allergies
                </span>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.allergies}
                  onChange={(e) => update("allergies", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Existing Conditions
                </span>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Asthma"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.medical_conditions}
                  onChange={(e) => update("medical_conditions", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Current Medications
                </span>
                <input
                  type="text"
                  placeholder="e.g. Metformin 500mg"
                  className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                  value={form.medications}
                  onChange={(e) => update("medications", e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/patient/login"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              ← Cancel and Return to Login
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:from-teal-500 hover:to-emerald-500 transition shadow-lg shadow-teal-600/20"
            >
              {busy ? "Creating Account..." : "Create Patient Account"}
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
