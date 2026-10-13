import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DoctorRegister() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    // Step 1: Account
    full_name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirm_password: "",

    // Step 2: Professional
    specialization: "General Physician",
    qualification: "MBBS, MD",
    experience_years: 5,
    medical_registration_number: "",
    medical_registration_council: "Maharashtra Medical Council",
    professional_bio: "",

    // Step 3: Hospital / Clinic
    hospital_name: "",
    clinic_address: "",
    city: "Nagpur",
    locality: "",
    state: "Maharashtra",
    pincode: "",

    // Step 4: Consultation & Availability
    consultation_fee: 500,
    available_start_time: "09:00",
    available_end_time: "18:00",
    available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

    // Step 5: Verification Code
    verification_code: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { doctorRegister } = useAuth();

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day) => {
    setForm((prev) => {
      const exists = prev.available_days.includes(day);
      if (exists) {
        return { ...prev, available_days: prev.available_days.filter((d) => d !== day) };
      } else {
        return { ...prev, available_days: [...prev.available_days, day] };
      }
    });
  };

  // Step validation
  const validateCurrentStep = () => {
    setError("");
    if (step === 1) {
      if (!form.full_name.trim()) return "Full name is required.";
      if (!form.email.trim()) return "Email address is required.";
      if (!form.phone.trim()) return "Phone number is required.";
      if (!form.password) return "Password is required.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      if (form.password !== form.confirm_password) return "Passwords do not match.";
    } else if (step === 2) {
      if (!form.specialization.trim()) return "Specialization is required.";
      if (!form.qualification.trim()) return "Qualification is required.";
      if (form.experience_years < 0) return "Experience years cannot be negative.";
      if (!form.medical_registration_number.trim()) return "Medical registration number is required.";
    } else if (step === 3) {
      if (!form.hospital_name.trim()) return "Hospital or clinic name is required.";
      if (!form.clinic_address.trim()) return "Clinic address is required.";
      if (!form.city.trim()) return "City is required.";
      if (!form.pincode.trim()) return "Pincode is required.";
    } else if (step === 4) {
      if (form.consultation_fee < 0) return "Consultation fee cannot be negative.";
      if (form.available_days.length === 0) return "Please select at least one available day.";
      if (form.available_end_time <= form.available_start_time) {
        return "Available end time must be later than start time.";
      }
    }
    return "";
  };

  const handleNext = (e) => {
    e.preventDefault();
    const err = validateCurrentStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((prev) => Math.min(5, prev + 1));
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.verification_code.trim()) {
      setError("Doctor verification code is required.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await doctorRegister({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        username: form.username.trim() || undefined,
        password: form.password,
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim(),
        experience_years: parseInt(form.experience_years, 10) || 0,
        medical_registration_number: form.medical_registration_number.trim(),
        medical_registration_council: form.medical_registration_council.trim(),
        hospital_name: form.hospital_name.trim(),
        clinic_address: form.clinic_address.trim(),
        city: form.city.trim(),
        locality: form.locality.trim() || undefined,
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        consultation_fee: parseFloat(form.consultation_fee) || 0,
        available_start_time: form.available_start_time,
        available_end_time: form.available_end_time,
        available_days: form.available_days,
        professional_bio: form.professional_bio.trim() || undefined,
        verification_code: form.verification_code.trim(),
      });

      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(
        typeof msg === "string"
          ? msg
          : "Doctor registration failed. Please verify your details and authorized verification code."
      );
    } finally {
      setBusy(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-[32px] bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-2xl text-center space-y-6 border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-4xl mx-auto shadow-inner">
            🩺
          </div>
          <div>
            <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-950/80 px-3 py-1 text-xs font-black uppercase text-amber-800 dark:text-amber-300 mb-3 border border-amber-300 dark:border-amber-800">
              Professional Status: Pending Verification
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              DOCTOR ACCOUNT CREATED SUCCESSFULLY
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
              Your HealthGuardian doctor account has been registered. Your clinical profile and medical credentials have been stored securely in our database.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 text-left text-xs space-y-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <div><strong className="text-slate-900 dark:text-white">Doctor Name:</strong> {form.full_name}</div>
            <div><strong className="text-slate-900 dark:text-white">Specialization:</strong> {form.specialization} ({form.qualification})</div>
            <div><strong className="text-slate-900 dark:text-white">Registration No:</strong> {form.medical_registration_number}</div>
            <div><strong className="text-slate-900 dark:text-white">Hospital/Clinic:</strong> {form.hospital_name}, {form.city}</div>
          </div>

          <div className="pt-2">
            <Link
              to="/doctor/login"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-4 text-sm font-black text-white hover:bg-cyan-500 transition shadow-lg shadow-cyan-600/20"
            >
              <span>Continue to Doctor Login</span>
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-10 text-slate-900 dark:text-white">
      <div className="max-w-4xl mx-auto rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="dark-scope bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10" data-theme-scope="dark">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-300 text-xs font-bold mb-2">
              🩺 DOCTOR REGISTRATION WIZARD
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Register as Doctor
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Join the HealthGuardian clinical network with verified professional credentials.
            </p>
          </div>
          <Link
            to="/doctor/login"
            className="text-xs font-bold text-cyan-300 hover:text-white border border-cyan-500/30 px-3.5 py-2 rounded-xl transition"
          >
            Already registered? Sign In
          </Link>
        </div>

        {/* 5-Step Stepper Progress Bar */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 sm:px-8">
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { num: 1, label: "Account" },
              { num: 2, label: "Professional" },
              { num: 3, label: "Hospital" },
              { num: 4, label: "Schedule" },
              { num: 5, label: "Verification" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex flex-col items-center gap-1 transition ${
                  step === s.num
                    ? "text-cyan-600 dark:text-cyan-400 font-black"
                    : step > s.num
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-slate-400"
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black ${
                    step === s.num
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                      : step > s.num
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className="text-[10px] sm:text-xs tracking-tight hidden sm:inline">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Forms */}
        <div className="p-6 sm:p-10">
          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 text-xs font-semibold text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* STEP 1: Account Information */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <h2 className="text-xl font-black">Step 1: Account Information</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create your login credentials and personal contact details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Doctor Full Name * (including title)
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Dr. Arvind Deshmukh"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address *
                  </span>
                  <input
                    required
                    type="email"
                    placeholder="doctor@example.com"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Contact Phone Number *
                  </span>
                  <input
                    required
                    type="tel"
                    placeholder="+91 9814694942 or 9922248081"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Username (Optional)
                  </span>
                  <input
                    type="text"
                    placeholder="arvind.deshmukh"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.username}
                    onChange={(e) => update("username", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password * (Min 8 chars, 1 digit)
                  </span>
                  <input
                    required
                    type="password"
                    placeholder="********"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm Password *
                  </span>
                  <input
                    required
                    type="password"
                    placeholder="********"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.confirm_password}
                    onChange={(e) => update("confirm_password", e.target.value)}
                  />
                </label>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm flex items-center gap-2 transition"
                >
                  <span>Continue to Professional Details</span>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Professional Information */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <h2 className="text-xl font-black">Step 2: Professional Information</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Specify your clinical credentials, specialization, and regulatory council registration.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Specialization *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. General Physician / Cardiologist"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.specialization}
                    onChange={(e) => update("specialization", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Qualification *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. MBBS, MD, MS"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.qualification}
                    onChange={(e) => update("qualification", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Years of Clinical Experience *
                  </span>
                  <input
                    required
                    min="0"
                    max="70"
                    type="number"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.experience_years}
                    onChange={(e) => update("experience_years", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Medical Registration Number *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. MMC-2010-04821"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.medical_registration_number}
                    onChange={(e) => update("medical_registration_number", e.target.value)}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Medical Registration Council
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra Medical Council"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.medical_registration_council}
                    onChange={(e) => update("medical_registration_council", e.target.value)}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Professional Bio (Summary)
                  </span>
                  <textarea
                    rows="3"
                    placeholder="Brief description of clinical practice, expertise, and patient care philosophy..."
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3 text-sm"
                    value={form.professional_bio}
                    onChange={(e) => update("professional_bio", e.target.value)}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  ← Back to Account
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm flex items-center gap-2 transition"
                >
                  <span>Continue to Hospital / Clinic</span>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Hospital / Clinic */}
          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <h2 className="text-xl font-black">Step 3: Hospital & Practice Location</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your clinic or affiliated hospital address so nearby patients can find you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hospital / Clinic Name *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Belokar Hospital or Max Care Clinic"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.hospital_name}
                    onChange={(e) => update("hospital_name", e.target.value)}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Clinic Address *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. MDR27, Vijay Colony, Amravati"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.clinic_address}
                    onChange={(e) => update("clinic_address", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    City *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Amravati or Nagpur"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Locality / Area
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Kathora Bk or Central"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.locality}
                    onChange={(e) => update("locality", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    State *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="Maharashtra"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pincode *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="440001"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.pincode}
                    onChange={(e) => update("pincode", e.target.value)}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  ← Back to Professional
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm flex items-center gap-2 transition"
                >
                  <span>Continue to Availability & Fees</span>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Consultation & Availability */}
          {step === 4 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <h2 className="text-xl font-black">Step 4: Consultation Details & Schedule</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure your consultation pricing and weekly visiting hours.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Consultation Fee (₹) *
                  </span>
                  <input
                    required
                    min="0"
                    step="50"
                    type="number"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.consultation_fee}
                    onChange={(e) => update("consultation_fee", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Available Start Time *
                  </span>
                  <input
                    required
                    type="time"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.available_start_time}
                    onChange={(e) => update("available_start_time", e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Available End Time *
                  </span>
                  <input
                    required
                    type="time"
                    className="input mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 p-3.5 text-sm"
                    value={form.available_end_time}
                    onChange={(e) => update("available_end_time", e.target.value)}
                  />
                </label>
              </div>

              {/* Available Days Checkboxes */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Available Days * (Select all applicable)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {ALL_DAYS.map((day) => {
                    const selected = form.available_days.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold text-left transition ${
                          selected
                            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                          selected ? "bg-cyan-600 text-white" : "border border-slate-300"
                        }`}>
                          {selected ? "✓" : ""}
                        </span>
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  ← Back to Hospital
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm flex items-center gap-2 transition"
                >
                  <span>Continue to Verification & Review</span>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Verification Code & Review & Submit */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h2 className="text-xl font-black">Step 5: Doctor Verification Code & Review</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your clinical authorization code and verify your submitted registration summary.
                </p>
              </div>

              {/* Verification Code Input */}
              <div className="rounded-2xl border-2 border-dashed border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20 p-6 space-y-3">
                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                  <span className="text-xl">🔒</span>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    DOCTOR VERIFICATION
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Enter your authorized doctor verification code to complete account registration.
                </p>
                <label className="block pt-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Doctor Verification Code *
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. DOCT2026"
                    className="input mt-1.5 w-full sm:max-w-md rounded-xl border border-cyan-300 dark:border-cyan-700 dark:bg-slate-800 p-3.5 text-sm font-mono tracking-widest font-black uppercase"
                    value={form.verification_code}
                    onChange={(e) => update("verification_code", e.target.value)}
                  />
                </label>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  * For the current development environment, use authorized code: <strong className="font-mono text-cyan-600 dark:text-cyan-300">DOCT2026</strong>.
                </div>
              </div>

              {/* Review Summary Card */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  REGISTRATION REVIEW
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                    <div className="font-black text-cyan-700 dark:text-cyan-400 uppercase text-[10px] tracking-wider mb-2">
                      Account & Contact
                    </div>
                    <div><strong className="text-slate-900 dark:text-white">Name:</strong> {form.full_name}</div>
                    <div><strong className="text-slate-900 dark:text-white">Email:</strong> {form.email}</div>
                    <div><strong className="text-slate-900 dark:text-white">Phone:</strong> {form.phone}</div>
                    {form.username && <div><strong className="text-slate-900 dark:text-white">Username:</strong> {form.username}</div>}
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                    <div className="font-black text-cyan-700 dark:text-cyan-400 uppercase text-[10px] tracking-wider mb-2">
                      Professional
                    </div>
                    <div><strong className="text-slate-900 dark:text-white">Specialization:</strong> {form.specialization}</div>
                    <div><strong className="text-slate-900 dark:text-white">Qualification:</strong> {form.qualification}</div>
                    <div><strong className="text-slate-900 dark:text-white">Experience:</strong> {form.experience_years} years</div>
                    <div><strong className="text-slate-900 dark:text-white">Reg No:</strong> {form.medical_registration_number}</div>
                    <div><strong className="text-slate-900 dark:text-white">Council:</strong> {form.medical_registration_council}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                    <div className="font-black text-cyan-700 dark:text-cyan-400 uppercase text-[10px] tracking-wider mb-2">
                      Hospital & Practice
                    </div>
                    <div><strong className="text-slate-900 dark:text-white">Hospital:</strong> {form.hospital_name}</div>
                    <div><strong className="text-slate-900 dark:text-white">Address:</strong> {form.clinic_address}</div>
                    <div><strong className="text-slate-900 dark:text-white">City / State:</strong> {form.city}, {form.state} - {form.pincode}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
                    <div className="font-black text-cyan-700 dark:text-cyan-400 uppercase text-[10px] tracking-wider mb-2">
                      Consultation & Schedule
                    </div>
                    <div><strong className="text-slate-900 dark:text-white">Fee:</strong> ₹{form.consultation_fee}</div>
                    <div><strong className="text-slate-900 dark:text-white">Timings:</strong> {form.available_start_time} - {form.available_end_time}</div>
                    <div><strong className="text-slate-900 dark:text-white">Days:</strong> {form.available_days.join(", ")}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  ← Edit Information
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-sm flex items-center gap-2 transition shadow-lg shadow-cyan-600/20 active:scale-[0.98]"
                >
                  {busy ? "Validating & Creating Account..." : "Create Doctor Account"}
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
