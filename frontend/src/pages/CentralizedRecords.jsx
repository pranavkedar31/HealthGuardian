import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import * as healthApi from "../api/health";
import * as reportsApi from "../api/reports";
import * as appointmentsApi from "../api/appointments";
import * as remindersApi from "../api/reminders";
import { prettyDate, bmiCategory } from "../utils/format";

function escapeHtml(str) {
  if (str === null || str === undefined) return "--";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function CentralizedRecords() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [profile, setProfile] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [sortOrder, setSortOrder] = useState("Newest");

  useEffect(() => {
    Promise.allSettled([
      healthApi.getHealthProfile(),
      healthApi.getVitals(),
      healthApi.getSymptomHistory(),
      reportsApi.getReportHistory(),
      appointmentsApi.listAppointments(),
      healthApi.getDietHistory(),
      healthApi.getWorkoutHistory(),
      remindersApi.listReminders(),
    ]).then(([p, v, s, r, a, d, w, rem]) => {
      if (p.status === "fulfilled") setProfile(p.value.data);

      const allRecords = [];

      if (v.status === "fulfilled" && v.value.data) {
        v.value.data.forEach((x, i) => {
          allRecords.push({
            id: `vital-${i}`,
            category: "Vitals",
            title: "Vital Reading",
            description: "Routine health metrics measurement",
            date: x.recorded_at,
            tone: "teal",
            icon: "activity",
            data: x,
          });
        });
      }

      if (s.status === "fulfilled" && s.value.data) {
        s.value.data.forEach((x, i) => {
          allRecords.push({
            id: `symptom-${i}`,
            category: "Symptoms",
            title: "Symptom Check",
            description: x.predicted_condition || "Symptom assessment",
            date: x.created_at,
            tone: "amber",
            icon: "alert",
            data: x,
          });
        });
      }

      if (r.status === "fulfilled" && r.value.data) {
        r.value.data.forEach((x, i) => {
          allRecords.push({
            id: `report-${i}`,
            category: "Reports",
            title: "Medical Report",
            description: x.original_filename || "Uploaded report",
            date: x.created_at,
            tone: "blue",
            icon: "file",
            data: x,
          });
        });
      }

      if (a.status === "fulfilled" && a.value.data) {
        a.value.data.forEach((x, i) => {
          allRecords.push({
            id: `appt-${i}`,
            category: "Appointments",
            title: "Doctor Appointment",
            description: `With Dr. ${x.doctor?.full_name || "Specialist"}`,
            date: x.scheduled_at,
            tone: "purple",
            icon: "calendar",
            data: x,
          });
        });
      }

      if (d.status === "fulfilled" && d.value.data) {
        d.value.data.forEach((x, i) => {
          allRecords.push({
            id: `diet-${i}`,
            category: "Diet Plans",
            title: "Diet Plan",
            description: "Personalized nutrition plan",
            date: x.created_at,
            tone: "green",
            icon: "heart",
            data: x,
          });
        });
      }

      if (w.status === "fulfilled" && w.value.data) {
        w.value.data.forEach((x, i) => {
          allRecords.push({
            id: `workout-${i}`,
            category: "Workout Plans",
            title: "Workout Plan",
            description: "Personalized fitness routine",
            date: x.created_at,
            tone: "orange",
            icon: "pulse",
            data: x,
          });
        });
      }

      if (rem.status === "fulfilled" && rem.value.data) {
        rem.value.data.forEach((x, i) => {
          allRecords.push({
            id: `rem-${i}`,
            category: "Reminders",
            title: "Medicine Reminder",
            description: `${x.medicine_name} - ${x.dosage}`,
            date: x.created_at || new Date().toISOString(),
            tone: "slate",
            icon: "bell",
            data: x,
          });
        });
      }

      setRecords(allRecords);
      setLoading(false);
    });
  }, []);

  const handleDownloadReport = (reportId) => {
    reportsApi.downloadReportPdf(reportId).catch((err) => {
      console.error("Download failed:", err);
      alert("Failed to download report.");
    });
  };

  // Generate and open clinical-formatted patient health dossier for printing or saving as PDF
  const handlePrintMedicalRecord = () => {
    const vitalsList = records.filter((r) => r.category === "Vitals");
    const symptomsList = records.filter((r) => r.category === "Symptoms");
    const reportsList = records.filter((r) => r.category === "Reports");
    const appointmentsList = records.filter((r) => r.category === "Appointments");
    const remindersList = records.filter((r) => r.category === "Reminders");
    const dietList = records.filter((r) => r.category === "Diet Plans");
    const workoutList = records.filter((r) => r.category === "Workout Plans");

    const bmiVal =
      profile?.height_cm && profile?.weight_kg
        ? (Number(profile.weight_kg) / (Number(profile.height_cm) / 100) ** 2).toFixed(1)
        : null;
    const bmiCat = bmiVal ? bmiCategory(bmiVal) : null;
    const patientName = user?.full_name || "Patient";
    const patientCity = [user?.location_area, user?.city, user?.state].filter(Boolean).join(", ") || "Not Specified";
    const patientPhone = user?.phone || "Not Specified";
    const patientEmail = user?.email || "Not Specified";
    const generationDate = new Date().toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const dossierId = `HG-PAT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HealthGuardian Dossier - ${escapeHtml(patientName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.45;
      margin: 0;
      padding: 0;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 24px 16px;
      }
      .screen-bar {
        position: sticky;
        top: 12px;
        z-index: 999;
        max-width: 860px;
        margin: 0 auto 16px auto;
        background: #0f172a;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 6px 20px rgba(0,0,0,0.18);
      }
      .screen-bar .info {
        font-size: 12px;
        color: #94a3b8;
      }
      .screen-bar .info strong {
        color: #2dd4bf;
      }
      .screen-bar .actions {
        display: flex;
        gap: 10px;
      }
      .btn-print {
        background: #0d9488;
        color: #ffffff;
        border: none;
        padding: 8px 18px;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .btn-print:hover {
        background: #0f766e;
      }
      .btn-close {
        background: transparent;
        color: #cbd5e1;
        border: 1px solid #334155;
        padding: 8px 14px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-close:hover {
        color: #ffffff;
        border-color: #64748b;
      }
      .paper {
        max-width: 860px;
        margin: 0 auto;
        background: #ffffff;
        padding: 36px 44px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        border-radius: 8px;
      }
    }
    @media print {
      .screen-bar {
        display: none !important;
      }
      .paper {
        padding: 0 !important;
      }
    }

    .header {
      border-bottom: 3px double #0d9488;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 17pt;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .brand-title span {
      color: #0d9488;
    }
    .doc-type {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #0f766e;
      margin-top: 2px;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748b;
    }
    .header-meta strong {
      color: #0f172a;
    }
    .badge-confidential {
      display: inline-block;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 7pt;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0f766e;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 3px;
      margin-top: 14px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title span.count {
      font-size: 8pt;
      font-weight: 600;
      color: #64748b;
    }

    .demographics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
    }
    .demo-item .label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .demo-item .value {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8.5pt;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 5px 7px;
      border: 1px solid #cbd5e1;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 5px 7px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #fafafa;
    }

    .status-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-normal { background: #dcfce7; color: #166534; }
    .status-alert { background: #fee2e2; color: #991b1b; }
    .status-neutral { background: #f1f5f9; color: #475569; }

    .avoid-break {
      page-break-inside: avoid;
    }

    .footer-block {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      padding-top: 10px;
      font-size: 7.5pt;
      color: #64748b;
      page-break-inside: avoid;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      margin-top: 26px;
      padding-top: 6px;
    }
    .sign-box {
      width: 30%;
      border-top: 1px dashed #94a3b8;
      text-align: center;
      padding-top: 4px;
      font-size: 8pt;
      font-weight: 600;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="screen-bar">
    <div class="info">
      📄 <strong>Print-Formatted Medical Dossier</strong> — Choose <em>"Save as PDF"</em> in your print dialog to download.
    </div>
    <div class="actions">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <div class="paper">
    <div class="header">
      <div>
        <div class="brand-title">Health<span>Guardian</span></div>
        <div class="doc-type">Comprehensive Patient Health Dossier</div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">
          Centralized Medical History · Diagnostic Records · Clinical Summary
        </div>
      </div>
      <div class="header-meta">
        <div><span class="badge-confidential">Confidential Medical Record</span></div>
        <div>Dossier ID: <strong>${escapeHtml(dossierId)}</strong></div>
        <div>Date Generated: <strong>${escapeHtml(generationDate)}</strong></div>
        <div>Platform: <strong>HealthGuardian Smart Healthcare</strong></div>
      </div>
    </div>

    <!-- PATIENT DEMOGRAPHICS -->
    <div class="section-title">1. Patient Baseline Profile & Demographics</div>
    <div class="demographics-grid">
      <div class="demo-item">
        <div class="label">Patient Name</div>
        <div class="value">${escapeHtml(patientName)}</div>
      </div>
      <div class="demo-item">
        <div class="label">Age / Gender</div>
        <div class="value">${escapeHtml(profile?.age ? profile.age + " yrs" : "--")} / ${escapeHtml(profile?.gender || "--")}</div>
      </div>
      <div class="demo-item">
        <div class="label">Blood Group</div>
        <div class="value" style="color: #b91c1c;">${escapeHtml(profile?.blood_group || "--")}</div>
      </div>
      <div class="demo-item">
        <div class="label">Location / City</div>
        <div class="value">${escapeHtml(patientCity)}</div>
      </div>

      <div class="demo-item">
        <div class="label">Height / Weight</div>
        <div class="value">${escapeHtml(profile?.height_cm ? profile.height_cm + " cm" : "--")} / ${escapeHtml(profile?.weight_kg ? profile.weight_kg + " kg" : "--")}</div>
      </div>
      <div class="demo-item">
        <div class="label">BMI / Assessment</div>
        <div class="value">${bmiVal ? `${bmiVal} (${escapeHtml(bmiCat?.label)})` : "--"}</div>
      </div>
      <div class="demo-item">
        <div class="label">Primary Contact</div>
        <div class="value">${escapeHtml(patientPhone)}</div>
      </div>
      <div class="demo-item">
        <div class="label">Email Address</div>
        <div class="value" style="font-size: 8.5pt;">${escapeHtml(patientEmail)}</div>
      </div>

      <div class="demo-item" style="grid-column: span 2;">
        <div class="label">Known Allergies</div>
        <div class="value" style="font-size: 8.5pt; color: #b45309;">
          ${profile?.allergies?.length ? escapeHtml(profile.allergies.join(", ")) : "None reported"}
        </div>
      </div>
      <div class="demo-item" style="grid-column: span 2;">
        <div class="label">Chronic Conditions</div>
        <div class="value" style="font-size: 8.5pt; color: #b45309;">
          ${profile?.chronic_conditions?.length ? escapeHtml(profile.chronic_conditions.join(", ")) : "None declared"}
        </div>
      </div>
    </div>

    <!-- VITALS LOG -->
    <div class="avoid-break">
      <div class="section-title">
        <span>2. Vital Signs Observation History</span>
        <span class="count">${vitalsList.length} readings</span>
      </div>
      ${vitalsList.length === 0 ? `<p style="font-size: 8.5pt; color: #94a3b8; font-style: italic;">No vital signs recorded yet.</p>` : `
      <table>
        <thead>
          <tr>
            <th style="width: 18%;">Recorded Date</th>
            <th style="width: 14%;">Heart Rate</th>
            <th style="width: 18%;">Blood Pressure</th>
            <th style="width: 14%;">Blood Sugar</th>
            <th style="width: 12%;">SpO₂</th>
            <th style="width: 12%;">Temp</th>
            <th style="width: 12%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${vitalsList.slice(0, 10).map((v) => {
            const d = v.data || {};
            const bp = d.blood_pressure_systolic && d.blood_pressure_diastolic
              ? `${d.blood_pressure_systolic}/${d.blood_pressure_diastolic} mmHg`
              : "--";
            const hr = d.heart_rate ? `${d.heart_rate} bpm` : "--";
            const bs = d.blood_sugar ? `${d.blood_sugar} mg/dL` : "--";
            const spo2 = d.spo2 ? `${d.spo2}%` : "--";
            const temp = d.temperature ? `${d.temperature}°C` : "--";
            const isAbnormal =
              (d.blood_pressure_systolic && d.blood_pressure_systolic >= 135) ||
              (d.blood_sugar && d.blood_sugar >= 140) ||
              (d.spo2 && d.spo2 < 95);
            return `<tr>
              <td><strong>${escapeHtml(prettyDate(v.date))}</strong></td>
              <td>${escapeHtml(hr)}</td>
              <td>${escapeHtml(bp)}</td>
              <td>${escapeHtml(bs)}</td>
              <td>${escapeHtml(spo2)}</td>
              <td>${escapeHtml(temp)}</td>
              <td><span class="status-badge ${isAbnormal ? "status-alert" : "status-normal"}">${isAbnormal ? "Flagged" : "Normal"}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
    </div>

    <!-- DIAGNOSTIC REPORTS -->
    <div class="avoid-break">
      <div class="section-title">
        <span>3. Diagnostic Reports & Lab Findings</span>
        <span class="count">${reportsList.length} reports</span>
      </div>
      ${reportsList.length === 0 ? `<p style="font-size: 8.5pt; color: #94a3b8; font-style: italic;">No diagnostic reports uploaded yet.</p>` : `
      <table>
        <thead>
          <tr>
            <th style="width: 18%;">Date</th>
            <th style="width: 25%;">Report / Test Name</th>
            <th style="width: 57%;">Clinical AI Findings & Key Extraction</th>
          </tr>
        </thead>
        <tbody>
          ${reportsList.map((r) => {
            const d = r.data || {};
            return `<tr>
              <td><strong>${escapeHtml(prettyDate(r.date))}</strong></td>
              <td>${escapeHtml(d.original_filename || r.title)}</td>
              <td style="line-height: 1.35;">${escapeHtml(d.summary || "Summary pending")}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
    </div>

    <!-- SYMPTOM CHECK HISTORY -->
    <div class="avoid-break">
      <div class="section-title">
        <span>4. AI Symptom Assessments & Triage History</span>
        <span class="count">${symptomsList.length} checks</span>
      </div>
      ${symptomsList.length === 0 ? `<p style="font-size: 8.5pt; color: #94a3b8; font-style: italic;">No symptom assessments on file.</p>` : `
      <table>
        <thead>
          <tr>
            <th style="width: 18%;">Assessment Date</th>
            <th style="width: 28%;">Reported Symptoms</th>
            <th style="width: 24%;">Suspected Condition</th>
            <th style="width: 12%;">Severity</th>
            <th style="width: 18%;">Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${symptomsList.slice(0, 8).map((s) => {
            const d = s.data || {};
            const sym = Array.isArray(d.symptoms) ? d.symptoms.join(", ") : d.symptoms || "--";
            return `<tr>
              <td><strong>${escapeHtml(prettyDate(s.date))}</strong></td>
              <td>${escapeHtml(sym)}</td>
              <td><strong>${escapeHtml(d.predicted_condition || "--")}</strong></td>
              <td><span class="status-badge status-neutral">${escapeHtml(d.severity || d.triage_level || "Standard")}</span></td>
              <td style="font-size: 7.5pt;">${escapeHtml(d.recommendation || "Consult physician")}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
    </div>

    <!-- DOCTOR APPOINTMENTS -->
    <div class="avoid-break">
      <div class="section-title">
        <span>5. Medical Consultations & Appointments</span>
        <span class="count">${appointmentsList.length} appointments</span>
      </div>
      ${appointmentsList.length === 0 ? `<p style="font-size: 8.5pt; color: #94a3b8; font-style: italic;">No doctor appointments scheduled.</p>` : `
      <table>
        <thead>
          <tr>
            <th style="width: 20%;">Date & Time</th>
            <th style="width: 25%;">Attending Physician</th>
            <th style="width: 25%;">Hospital / Clinic</th>
            <th style="width: 15%;">Status</th>
            <th style="width: 15%;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${appointmentsList.map((a) => {
            const d = a.data || {};
            return `<tr>
              <td><strong>${escapeHtml(prettyDate(a.date))}</strong></td>
              <td>Dr. ${escapeHtml(d.doctor?.full_name || "--")} <br><small style="color: #64748b;">${escapeHtml(d.doctor?.specialization || "")}</small></td>
              <td>${escapeHtml(d.doctor?.hospital_name || "--")}</td>
              <td><span class="status-badge ${d.status === "confirmed" ? "status-normal" : "status-neutral"}">${escapeHtml(d.status || "--")}</span></td>
              <td>${escapeHtml(d.notes || "--")}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
    </div>

    <!-- ACTIVE MEDICATIONS & REMINDERS -->
    <div class="avoid-break">
      <div class="section-title">
        <span>6. Active Medication & Prescription Schedule</span>
        <span class="count">${remindersList.length} medications</span>
      </div>
      ${remindersList.length === 0 ? `<p style="font-size: 8.5pt; color: #94a3b8; font-style: italic;">No active medicine reminders configured.</p>` : `
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">Medication Name</th>
            <th style="width: 25%;">Dosage</th>
            <th style="width: 20%;">Scheduled Time</th>
            <th style="width: 15%;">Frequency</th>
            <th style="width: 10%;">Regimen</th>
          </tr>
        </thead>
        <tbody>
          ${remindersList.map((rem) => {
            const d = rem.data || {};
            return `<tr>
              <td><strong>${escapeHtml(d.medicine_name || rem.title)}</strong></td>
              <td>${escapeHtml(d.dosage || "1 dose")}</td>
              <td>${escapeHtml(d.reminder_time || "--")}</td>
              <td>${escapeHtml(d.frequency || "Daily")}</td>
              <td><span class="status-badge ${d.is_active ? "status-normal" : "status-neutral"}">${d.is_active ? "Active" : "Paused"}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
    </div>

    <!-- WELLNESS DIRECTIVES (DIET / WORKOUT) -->
    ${dietList.length > 0 || workoutList.length > 0 ? `
    <div class="avoid-break">
      <div class="section-title">
        <span>7. Preventive Nutrition & Activity Directives</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 8pt;">
        ${dietList.length > 0 ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
          <strong style="color: #0f766e; text-transform: uppercase;">Latest Nutrition Directives:</strong>
          <p style="margin: 4px 0 0 0; color: #334155; line-height: 1.35; max-height: 120px; overflow: hidden;">
            ${escapeHtml((dietList[0].data?.plan_details || dietList[0].data?.plan_content || "Personalized balanced meal plan designed for preventive health.").slice(0, 300))}...
          </p>
        </div>` : ""}
        ${workoutList.length > 0 ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px;">
          <strong style="color: #0f766e; text-transform: uppercase;">Latest Physical Activity Plan:</strong>
          <p style="margin: 4px 0 0 0; color: #334155; line-height: 1.35; max-height: 120px; overflow: hidden;">
            ${escapeHtml((workoutList[0].data?.plan_details || workoutList[0].data?.plan_content || "Tailored cardio and strength routine targeting functional baseline fitness.").slice(0, 300))}...
          </p>
        </div>` : ""}
      </div>
    </div>` : ""}

    <!-- FOOTER & CLINICAL ATTESTATION -->
    <div class="footer-block">
      <p style="margin: 0; line-height: 1.4;">
        <strong>Clinical Disclaimer & Legal Notice:</strong> This health dossier is a consolidated summary compiled from patient observations, diagnostic test summaries, and automated triage modules generated by HealthGuardian. It is intended to assist medical practitioners during clinical evaluations and provide continuity of preventive care. All diagnostic inferences should be clinically verified by a licensed physician before therapeutic intervention.
      </p>
      <div class="sign-row">
        <div class="sign-box">Patient / Guardian Signature</div>
        <div class="sign-box">Attending Physician / Reviewer</div>
        <div class="sign-box">Date & Clinical Stamp</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Please allow pop-ups for this website in your browser settings so your printable medical record can open.");
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter((r) => r.category === categoryFilter);
    }

    if (dateFilter !== "All Time") {
      const now = new Date();
      result = result.filter((r) => {
        const rDate = new Date(r.date);
        const diffTime = Math.abs(now - rDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (dateFilter === "Last 7 Days") return diffDays <= 7;
        if (dateFilter === "Last 30 Days") return diffDays <= 30;
        if (dateFilter === "Last 3 Months") return diffDays <= 90;
        if (dateFilter === "Last 6 Months") return diffDays <= 180;
        if (dateFilter === "Last Year") return diffDays <= 365;
        return true;
      });
    }

    result.sort((a, b) => {
      const d1 = new Date(a.date).getTime();
      const d2 = new Date(b.date).getTime();
      return sortOrder === "Newest" ? d2 - d1 : d1 - d2;
    });

    return result;
  }, [records, search, categoryFilter, dateFilter, sortOrder]);

  const stats = useMemo(() => {
    return {
      total: records.length,
      vitals: records.filter((r) => r.category === "Vitals").length,
      symptoms: records.filter((r) => r.category === "Symptoms").length,
      reports: records.filter((r) => r.category === "Reports").length,
      appointments: records.filter((r) => r.category === "Appointments").length,
      plans: records.filter((r) => r.category === "Diet Plans" || r.category === "Workout Plans").length,
      reminders: records.filter((r) => r.category === "Reminders").length,
    };
  }, [records]);

  if (loading) {
    return (
      <>
        <Navbar />
        <Page title="Centralized Records" subtitle="Loading all your health data...">
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm font-bold text-slate-400">Loading records...</div>
          </div>
        </Page>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Page
        title="Centralized Health Records"
        subtitle="A unified view of all your health logs, reports, and activities."
      >
        {/* HERO HEADER */}
        <div className="mb-6 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-teal-300 mb-3">
              <span>🏥</span> Comprehensive Health Archive
            </div>
            <h2 className="text-2xl font-black sm:text-4xl">Centralized Health Records</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Access your complete health history in one unified view. Filter, search, and generate a printable clinical dossier or save as PDF anytime.
            </p>
          </div>
          <div className="mt-6 sm:mt-0 flex flex-col items-end gap-3 shrink-0">
            <div className="rounded-full bg-teal-900/50 px-4 py-2 border border-teal-800 text-sm font-bold text-teal-200">
              Total Records: {stats.total}
            </div>
            <button
              onClick={handlePrintMedicalRecord}
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-teal-300 transition"
            >
              <span>🖨️</span> Print / Save as PDF
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard title="Vitals" count={stats.vitals} icon="activity" tone="teal" />
          <StatCard title="Symptoms" count={stats.symptoms} icon="alert" tone="amber" />
          <StatCard title="Reports" count={stats.reports} icon="file" tone="blue" />
          <StatCard title="Appointments" count={stats.appointments} icon="calendar" tone="purple" />
          <StatCard title="Plans" count={stats.plans} icon="heart" tone="green" />
          <StatCard title="Reminders" count={stats.reminders} icon="bell" tone="slate" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* MAIN RECORDS AREA */}
          <div className="space-y-4">
            {/* TOOLBAR */}
            <Card className="!p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="search" size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium placeholder-slate-400 focus:border-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="All">All Categories</option>
                  <option value="Vitals">Vitals</option>
                  <option value="Symptoms">Symptoms</option>
                  <option value="Reports">Reports</option>
                  <option value="Appointments">Appointments</option>
                  <option value="Diet Plans">Diet Plans</option>
                  <option value="Workout Plans">Workout Plans</option>
                  <option value="Reminders">Reminders</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  <option value="All Time">All Time</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 3 Months">Last 3 Months</option>
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="Last Year">Last Year</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === "Newest" ? "Oldest" : "Newest")}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <span>Sort: {sortOrder}</span>
                </button>
              </div>
            </Card>

            {/* RECORD CARDS LIST */}
            {filteredRecords.length === 0 ? (
              <Card className="!p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-3">
                  <Icon name="search" size={24} />
                </div>
                <div className="text-sm font-black text-slate-800">No records found</div>
                <p className="mt-1 text-xs text-slate-500">
                  Try adjusting your search criteria or add new entries to your health profile.
                </p>
              </Card>
            ) : (
              filteredRecords.map((r) => (
                <Card key={r.id} className="!p-4 transition hover:border-teal-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2.5 ${getToneBg(r.tone)}`}>
                        <Icon name={r.icon} size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${getToneBadge(r.tone)}`}>
                            {r.category}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {prettyDate(r.date)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-black text-slate-900">{r.title}</div>
                        <p className="mt-0.5 text-xs text-slate-500 font-medium">{r.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="self-start sm:self-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      {expandedId === r.id ? "Hide Details" : "View Details"}
                    </button>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {expandedId === r.id && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {renderRecordDetails(r.category, r.data, handleDownloadReport)}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* PRINT DOSSIER PROMOTIONAL CARD */}
            <Card title="Patient Health Dossier" className="!p-5 border-teal-200 bg-gradient-to-br from-teal-50/40 to-white">
              <div className="flex items-center gap-2 text-xs font-black text-teal-800 dark:text-teal-400 uppercase tracking-wider">
                <span>📋</span> Clinical Print Export
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Generate a professionally formatted, hospital-grade medical dossier containing your baseline demographics, vitals, diagnostic summaries, and prescription schedule.
              </p>
              <button
                onClick={handlePrintMedicalRecord}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 transition"
              >
                <span>🖨️</span>
                <span>Print / Save as PDF</span>
              </button>
              <div className="mt-2 text-[10px] text-center text-slate-400 font-medium">
                Perfect for physician visits, second opinions & insurance
              </div>
            </Card>

            <Card title="Health Profile" className="!p-5">
              {profile ? (
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Patient</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {user?.full_name || "--"}
                      {user?.full_name && <span title="Verified / Locked" className="text-[11px]">🔒</span>}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Age</span>
                    <span className="font-bold text-slate-900 dark:text-white">{profile.age ? `${profile.age} yrs` : "--"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Gender</span>
                    <span className="font-bold capitalize text-slate-900 dark:text-white flex items-center gap-1">
                      {profile.gender || "--"}
                      {profile.gender && <span title="Verified / Locked" className="text-[11px]">🔒</span>}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Blood Group</span>
                    <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                      {profile.blood_group || "--"}
                      {profile.blood_group && <span title="Verified / Locked" className="text-[11px]">🔒</span>}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Height</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {profile.height_cm ? `${profile.height_cm} cm` : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Weight</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {profile.weight_kg ? `${profile.weight_kg} kg` : "--"}
                    </span>
                  </div>
                  <Link
                    to="/health-profile"
                    className="mt-2 block rounded-xl bg-slate-50 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Edit Profile
                  </Link>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Profile data unavailable.</div>
              )}
            </Card>

            <Card title="Record Breakdown" className="!p-5">
              <div className="space-y-3">
                <BreakdownBar label="Vitals" count={stats.vitals} total={stats.total} color="bg-teal-500" />
                <BreakdownBar label="Symptoms" count={stats.symptoms} total={stats.total} color="bg-amber-500" />
                <BreakdownBar label="Reports" count={stats.reports} total={stats.total} color="bg-blue-500" />
                <BreakdownBar label="Appointments" count={stats.appointments} total={stats.total} color="bg-purple-500" />
                <BreakdownBar label="Plans" count={stats.plans} total={stats.total} color="bg-green-500" />
                <BreakdownBar label="Reminders" count={stats.reminders} total={stats.total} color="bg-slate-500" />
              </div>
            </Card>

            <Card title="Quick Links" className="!p-5">
              <div className="flex flex-col gap-2">
                <Link to="/vitals" className="text-xs font-bold text-teal-600 hover:underline">→ Log New Vitals</Link>
                <Link to="/symptom-checker" className="text-xs font-bold text-teal-600 hover:underline">→ Run a Symptom Check</Link>
                <Link to="/reports" className="text-xs font-bold text-teal-600 hover:underline">→ Upload a New Report</Link>
                <Link to="/diet-workout" className="text-xs font-bold text-teal-600 hover:underline">→ Create Diet/Workout Plan</Link>
              </div>
            </Card>
          </div>
        </div>
      </Page>
    </>
  );
}

function StatCard({ title, count, icon, tone }) {
  const colors = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700",
    slate: "bg-slate-50 text-slate-700",
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon name={icon} size={14} />
        <span className="text-[10px] font-black uppercase tracking-wider">{title}</span>
      </div>
      <div className="mt-2 text-2xl font-black">{count}</div>
    </div>
  );
}

function BreakdownBar({ label, count, total, color }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}

function getToneBg(tone) {
  const map = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return map[tone] || "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function getToneBadge(tone) {
  const map = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return map[tone] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function renderRecordDetails(category, data, onDownload) {
  if (!data) return <div className="text-xs text-slate-400">No additional details recorded.</div>;

  if (category === "Vitals") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <DetailItem label="Heart Rate" value={data.heart_rate ? `${data.heart_rate} bpm` : "--"} />
        <DetailItem
          label="Blood Pressure"
          value={
            data.blood_pressure_systolic && data.blood_pressure_diastolic
              ? `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic} mmHg`
              : "--"
          }
        />
        <DetailItem label="Blood Sugar" value={data.blood_sugar ? `${data.blood_sugar} mg/dL` : "--"} />
        <DetailItem label="SpO2" value={data.spo2 ? `${data.spo2}%` : "--"} />
        <DetailItem label="Temperature" value={data.temperature ? `${data.temperature} °C` : "--"} />
        <DetailItem label="Respiratory Rate" value={data.respiratory_rate ? `${data.respiratory_rate} bpm` : "--"} />
      </div>
    );
  }

  if (category === "Symptoms") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Predicted Condition" value={data.predicted_condition || "--"} />
          <DetailItem label="Severity Level" value={data.severity || "--"} />
        </div>
        {data.symptoms && (
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Reported Symptoms
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(data.symptoms) ? data.symptoms : [data.symptoms]).map((s, idx) => (
                <span key={idx} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.recommendation && (
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              AI Recommendation
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl">{data.recommendation}</p>
          </div>
        )}
      </div>
    );
  }

  if (category === "Reports") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Filename" value={data.original_filename || "--"} />
          <DetailItem label="Language" value={data.summary_language || "English"} />
        </div>
        {data.summary && (
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Report Summary
            </span>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs leading-5 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {data.summary}
            </div>
          </div>
        )}
        <button
          onClick={() => onDownload(data.id)}
          className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 transition"
        >
          <Icon name="file" size={14} /> Download PDF
        </button>
      </div>
    );
  }

  if (category === "Appointments") {
    return (
      <div className="grid grid-cols-2 gap-4">
        <DetailItem label="Doctor" value={data.doctor?.full_name ? `Dr. ${data.doctor.full_name}` : "--"} />
        <DetailItem label="Hospital" value={data.doctor?.hospital_name || "--"} />
        <DetailItem label="Specialization" value={data.doctor?.specialization || "--"} />
        <DetailItem label="Status" value={data.status || "--"} />
        <DetailItem label="Notes" value={data.notes || "No notes"} />
      </div>
    );
  }

  if (category === "Diet Plans" || category === "Workout Plans") {
    return (
      <div>
        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Plan Content</span>
        <div className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-medium max-h-60 overflow-y-auto">
          {data.plan_details || data.plan_content || data.content || "No details available."}
        </div>
      </div>
    );
  }

  if (category === "Reminders") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <DetailItem label="Medicine" value={data.medicine_name || "--"} />
        <DetailItem label="Dosage" value={data.dosage || "--"} />
        <DetailItem label="Time" value={data.reminder_time || "--"} />
        <DetailItem label="Frequency" value={data.frequency || "--"} />
        <DetailItem label="Status" value={data.is_active ? "Active" : "Inactive"} />
      </div>
    );
  }

  return <div className="text-xs text-slate-500 dark:text-slate-400">No details available.</div>;
}

function DetailItem({ label, value }) {
  return (
    <div>
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-xs font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
