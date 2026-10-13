import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import * as api from "../api/health";
import { prettyDate } from "../utils/format";

const empty = {
  heart_rate: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  blood_sugar: "",
  spo2: "",
  temperature: "",
};

const METRICS = {
  heart_rate: {
    label: "Heart Rate",
    unit: "bpm",
    icon: "pulse",
    description: "Heart rate recorded over time.",
  },

  blood_pressure: {
    label: "Blood Pressure",
    unit: "mmHg",
    icon: "activity",
    description:
      "Systolic and diastolic blood pressure over time.",
  },

  blood_sugar: {
    label: "Blood Sugar",
    unit: "mg/dL",
    icon: "activity",
    description:
      "Blood sugar readings recorded over time.",
  },

  spo2: {
    label: "SpO₂",
    unit: "%",
    icon: "pulse",
    description:
      "Blood oxygen saturation recorded over time.",
  },

  temperature: {
    label: "Temperature",
    unit: "°C",
    icon: "activity",
    description:
      "Body temperature readings recorded over time.",
  },
};

export default function Vitals() {
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMetric, setSelectedMetric] =
    useState("heart_rate");

  /* =========================================================
     LOAD VITALS
     ========================================================= */

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const response = await api.getVitals();

      console.log(
        "HealthGuardian /vitals response:",
        response.data
      );

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      /*
       * IMPORTANT:
       * Always sort newest reading first.
       */
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(
          a.recorded_at || 0
        ).getTime();

        const dateB = new Date(
          b.recorded_at || 0
        ).getTime();

        return dateB - dateA;
      });

      console.log(
        "HealthGuardian sorted vitals:",
        sorted
      );

      setItems(sorted);
    } catch (err) {
      console.error(
        "HealthGuardian vitals error:",
        err
      );

      /* Only clear data on first load failure;
         keep existing items if a background reload fails. */
      setItems((prev) =>
        prev.length > 0 ? prev : []
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load vital readings."
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* =========================================================
     SAVE VITAL
     ========================================================= */

  const submit = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");

    const payload = Object.fromEntries(
      Object.entries(form)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => [
          key,
          Number(value),
        ])
    );

    if (!Object.keys(payload).length) {
      setError(
        "Enter at least one vital value."
      );

      setBusy(false);
      return;
    }

    try {
      const response = await api.createVital(payload);

      setForm(empty);

      /* Immediately add the newly created record to
         the items list so the latest-value cards and
         chart update without waiting for a full reload. */
      const created = response.data;
      if (created && created.id) {
        setItems((prev) => {
          const merged = [created, ...prev];
          merged.sort((a, b) => {
            const dateA = new Date(a.recorded_at || 0).getTime();
            const dateB = new Date(b.recorded_at || 0).getTime();
            return dateB - dateA;
          });
          return merged;
        });
      }

      /* Also refresh from the server to stay in sync (silent
         so the chart doesn't flash "Loading…"). */
      load(true).catch(() => {});
    } catch (err) {
      console.error(
        "HealthGuardian save vital error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to save vital reading."
      );
    } finally {
      setBusy(false);
    }
  };




  /* =========================================================
     LATEST VITALS  (drives the mini cards)
     =========================================================
     Computed from items so any setItems() call automatically
     re-evaluates and re-renders the mini cards.
     Uses toNumber() so that 0 is treated as a valid value.
     ========================================================= */

  const latestVitals = useMemo(() => {
    console.log("HealthGuardian latestVitals recomputing, items.length:", items.length);
    if (items.length > 0) {
      console.log("HealthGuardian first item:", JSON.stringify(items[0]));
      console.log("HealthGuardian first item heart_rate:", items[0].heart_rate, "type:", typeof items[0].heart_rate);
      console.log("HealthGuardian toNumber(heart_rate):", toNumber(items[0].heart_rate));
    }

    const findLatest = (key) => {
      const rec = items.find(
        (item) => toNumber(item[key]) !== null
      );
      console.log("HealthGuardian findLatest", key, "found:", rec ? toNumber(rec[key]) : "nothing");
      return rec ? toNumber(rec[key]) : null;
    };

    const bpRec = items.find(
      (item) =>
        toNumber(item.blood_pressure_systolic) !== null ||
        toNumber(item.blood_pressure_diastolic) !== null
    );

    const result = {
      heart_rate:    findLatest("heart_rate"),
      blood_sugar:   findLatest("blood_sugar"),
      spo2:          findLatest("spo2"),
      temperature:   findLatest("temperature"),
      bp_systolic:   bpRec ? toNumber(bpRec.blood_pressure_systolic) : null,
      bp_diastolic:  bpRec ? toNumber(bpRec.blood_pressure_diastolic) : null,
    };
    console.log("HealthGuardian latestVitals result:", result);
    return result;
  }, [items]);

  /* =========================================================
     CHART DATA
     Oldest -> newest
     ========================================================= */

  const { chartData } = useMemo(() => {
    const data = [...items]
      .reverse()
      .map((item) => {
        if (selectedMetric === "blood_pressure") {
          return {
            date: item.recorded_at,
            systolic: toNumber(item.blood_pressure_systolic),
            diastolic: toNumber(item.blood_pressure_diastolic),
          };
        }
        return {
          date: item.recorded_at,
          value: toNumber(item[selectedMetric]),
        };
      })
      .filter((item) => {
        if (selectedMetric === "blood_pressure") {
          return item.systolic !== null || item.diastolic !== null;
        }
        return item.value !== null;
      });

    /* --- stats --- */
    const numericValues =
      selectedMetric === "blood_pressure"
        ? data.flatMap((item) =>
            [item.systolic, item.diastolic].filter((v) => v !== null)
          )
        : data.map((item) => item.value).filter((v) => v !== null);

    let stats;
    if (!numericValues.length) {
      stats = { latest: null, minimum: null, maximum: null };
    } else {
      const last = data[data.length - 1];
      stats = {
        latest:
          selectedMetric === "blood_pressure"
            ? last?.systolic !== null && last?.systolic !== undefined
              ? `${last.systolic}/${last.diastolic ?? "—"}`
              : last?.diastolic !== null && last?.diastolic !== undefined
              ? `—/${last.diastolic}`
              : null
            : last?.value ?? null,
        minimum: Math.min(...numericValues),
        maximum: Math.max(...numericValues),
      };
    }

    console.log("HealthGuardian chartData.length:", data.length, "stats:", stats);
    return { chartData: data, chartStats: stats };
  }, [items, selectedMetric]);

  const metric =
    METRICS[selectedMetric];

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <>
      <Navbar />

      <Page
        title="Vitals & Trends"
        subtitle="Record your health measurements and visualize how your vital parameters change over time."
      >
        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[390px_1fr]">

          {/* =====================================================
              RECORD READING
              ===================================================== */}

          <Card
            title="Record a reading"
            subtitle="Enter only the measurements you have available."
            accent
          >
            <form
              onSubmit={submit}
              className="space-y-4"
            >
              <VitalInput
                label="Heart rate"
                unit="bpm"
                value={
                  form.heart_rate
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    heart_rate:
                      value,
                  })
                }
              />

              <VitalInput
                label="BP systolic"
                unit="mmHg"
                value={
                  form.blood_pressure_systolic
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    blood_pressure_systolic:
                      value,
                  })
                }
              />

              <VitalInput
                label="BP diastolic"
                unit="mmHg"
                value={
                  form.blood_pressure_diastolic
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    blood_pressure_diastolic:
                      value,
                  })
                }
              />

              <VitalInput
                label="Blood sugar"
                unit="mg/dL"
                value={
                  form.blood_sugar
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    blood_sugar:
                      value,
                  })
                }
              />

              <VitalInput
                label="SpO₂"
                unit="%"
                value={form.spo2}
                onChange={(value) =>
                  setForm({
                    ...form,
                    spo2: value,
                  })
                }
              />

              <VitalInput
                label="Temperature"
                unit="°C"
                value={
                  form.temperature
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    temperature:
                      value,
                  })
                }
              />

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={busy}
              >
                {busy
                  ? "Saving..."
                  : "Save reading"}

                <Icon
                  name="check"
                  size={17}
                />
              </button>
            </form>
          </Card>

          {/* =====================================================
              DASHBOARD
              ===================================================== */}

          <div className="space-y-5">


            {/* =================================================
                LATEST VITALS CARDS
                ================================================= */}

            <div key={items.length + "-" + (latestVitals.heart_rate ?? "x")} className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {(() => { console.log("HealthGuardian MINI CARDS rendering, latestVitals:", latestVitals, "items.length:", items.length); return null; })()}

              {/* Heart Rate */}
              <Mini
                label="Heart rate"
                icon="pulse"
                value={
                  latestVitals.heart_rate !== null
                    ? `${latestVitals.heart_rate} bpm`
                    : "—"
                }
              />

              {/* Blood Pressure */}
              <Mini
                label="Blood pressure"
                icon="activity"
                value={
                  latestVitals.bp_systolic !== null ||
                  latestVitals.bp_diastolic !== null
                    ? `${latestVitals.bp_systolic ?? "—"}/${latestVitals.bp_diastolic ?? "—"}`
                    : "—"
                }
              />

              {/* Blood Sugar */}
              <Mini
                label="Blood sugar"
                icon="activity"
                value={
                  latestVitals.blood_sugar !== null
                    ? `${latestVitals.blood_sugar} mg/dL`
                    : "—"
                }
              />

              {/* SpO2 */}
              <Mini
                label="SpO₂"
                icon="pulse"
                value={
                  latestVitals.spo2 !== null
                    ? `${latestVitals.spo2}%`
                    : "—"
                }
              />

              {/* Temperature */}
              <Mini
                label="Temperature"
                icon="activity"
                value={
                  latestVitals.temperature !== null
                    ? `${latestVitals.temperature}°C`
                    : "—"
                }
              />

            </div>

            {/* =================================================
                TREND CHART
                ================================================= */}

            <Card
              title="Vital parameter trends"
              subtitle="Select a parameter to visualize its recorded trend."
            >
              <div className="mb-5 flex flex-wrap gap-2">

                {Object.entries(
                  METRICS
                ).map(
                  ([key, option]) => {
                    const active =
                      selectedMetric ===
                      key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSelectedMetric(
                            key
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          active
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  }
                )}

              </div>

              <div key={selectedMetric} className="mb-4 flex items-start justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2">

                    <Icon
                      name={
                        METRICS[selectedMetric].icon
                      }
                      size={18}
                    />

                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {METRICS[selectedMetric].label} trend
                    </h3>

                  </div>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {METRICS[selectedMetric].description}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-right">

                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Latest
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">

                    {selectedMetric === "blood_pressure"
                      ? ((latestVitals.bp_systolic != null || latestVitals.bp_diastolic != null)
                          ? `${latestVitals.bp_systolic ?? "—"}/${latestVitals.bp_diastolic ?? "—"} mmHg`
                          : "No data")
                      : (latestVitals && latestVitals[selectedMetric] != null
                          ? `${latestVitals[selectedMetric]} ${METRICS[selectedMetric]?.unit || ""}`
                          : "No data")
                    }

                  </div>

                </div>

              </div>

              {loading ? (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-50">
                  <p className="text-sm font-bold text-slate-500">
                    Loading vital readings...
                  </p>
                </div>
              ) : chartData.length >
                0 ? (
                <TrendChart
                  data={chartData}
                  metric={
                    selectedMetric
                  }
                  unit={metric.unit}
                />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-50">

                  <div className="text-center">

                    <Icon
                      name="pulse"
                      size={28}
                    />

                    <p className="mt-3 text-sm font-bold text-slate-600">
                      No{" "}
                      {metric.label.toLowerCase()}{" "}
                      readings yet.
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Save a reading to start building your trend.
                    </p>

                  </div>

                </div>
              )}

            </Card>



            {/* =================================================
                READING HISTORY
                ================================================= */}

            <Card title="Reading history">

              <div className="overflow-x-auto">

                <table className="w-full min-w-[760px] text-left text-sm">

                  <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">

                    <tr>
                      <th className="pb-3">
                        Recorded
                      </th>

                      <th>
                        Heart
                      </th>

                      <th>
                        BP
                      </th>

                      <th>
                        Sugar
                      </th>

                      <th>
                        SpO₂
                      </th>

                      <th>
                        Temp.
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {items.map(
                      (v) => (
                        <tr
                          key={v.id}
                          className="border-b border-slate-50"
                        >

                          <td className="py-4 text-xs text-slate-500">
                            {prettyDate(
                              v.recorded_at
                            )}
                          </td>

                          <td className="font-bold">
                            {v.heart_rate ??
                              "—"}
                          </td>

                          <td>
                            {hasValue(
                              v.blood_pressure_systolic
                            ) ||
                            hasValue(
                              v.blood_pressure_diastolic
                            )
                              ? `${v.blood_pressure_systolic ?? "—"}/${v.blood_pressure_diastolic ?? "—"}`
                              : "—"}
                          </td>

                          <td>
                            {v.blood_sugar ??
                              "—"}
                          </td>

                          <td>
                            {v.spo2 ??
                              "—"}
                          </td>

                          <td>
                            {v.temperature ??
                              "—"}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

                {!loading &&
                  items.length ===
                    0 && (
                    <div className="p-10 text-center text-xs text-slate-500">
                      No vital readings yet.
                    </div>
                  )}

              </div>

            </Card>

          </div>
        </div>
      </Page>
    </>
  );
}

/* ===============================================================
   INPUT
   =============================================================== */

function VitalInput({
  label,
  unit,
  value,
  onChange,
}) {
  return (
    <label className="block">

      <span className="label">
        {label}
      </span>

      <div className="relative">

        <input
          className="input pr-14"
          type="number"
          step="0.1"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
        />

        <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">
          {unit}
        </span>

      </div>

    </label>
  );
}

/* ===============================================================
   MINI CARD
   =============================================================== */

function Mini({
  label,
  value,
  icon,
}) {
  return (
    <div className="metric-card">

      <div className="flex items-center justify-between">

        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
          {label}
        </span>

        <Icon
          name={icon}
          size={16}
        />

      </div>

      <div className="mt-2 text-xl font-black">
        {value}
      </div>

    </div>
  );
}



/* ===============================================================
   CHART
   =============================================================== */

function TrendChart({
  data,
  metric,
  unit,
}) {
  const width = 900;
  const height = 310;

  const padding = {
    top: 30,
    right: 30,
    bottom: 55,
    left: 55,
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  const values =
    metric ===
    "blood_pressure"
      ? data.flatMap(
          (item) =>
            [
              item.systolic,
              item.diastolic,
            ].filter(
              (value) =>
                value !== null
            )
        )
      : data
          .map(
            (item) =>
              item.value
          )
          .filter(
            (value) =>
              value !== null
          );

  if (!values.length) {
    return null;
  }

  let minimum =
    Math.min(...values);

  let maximum =
    Math.max(...values);

  if (minimum === maximum) {
    minimum -= 5;
    maximum += 5;
  } else {
    const range =
      maximum - minimum;

    minimum -=
      range * 0.12;

    maximum +=
      range * 0.12;
  }

  const getX = (index) => {
    if (data.length === 1) {
      return (
        padding.left +
        chartWidth / 2
      );
    }

    return (
      padding.left +
      (index /
        (data.length - 1)) *
        chartWidth
    );
  };

  const getY = (value) => {
    return (
      padding.top +
      ((maximum - value) /
        (maximum - minimum)) *
        chartHeight
    );
  };

  const createPath = (key) => {
    const points = data
      .map(
        (item, index) => {
          const value =
            item[key];

          if (
            value === null ||
            value === undefined
          ) {
            return null;
          }

          return {
            x: getX(index),
            y: getY(value),
          };
        }
      )
      .filter(Boolean);

    if (!points.length) {
      return "";
    }

    return points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      )
      .join(" ");
  };

  const mainPath =
    metric ===
    "blood_pressure"
      ? null
      : createPath("value");

  const systolicPath =
    metric ===
    "blood_pressure"
      ? createPath(
          "systolic"
        )
      : null;

  const diastolicPath =
    metric ===
    "blood_pressure"
      ? createPath(
          "diastolic"
        )
      : null;

  const gridCount = 5;

  const yLabels =
    Array.from(
      {
        length: gridCount,
      },
      (_, index) => {
        const ratio =
          index /
          (gridCount - 1);

        return {
          value:
            maximum -
            ratio *
              (maximum -
                minimum),

          y:
            padding.top +
            ratio *
              chartHeight,
        };
      }
    );

  const labelStep =
    Math.max(
      1,
      Math.ceil(
        data.length / 6
      )
    );

  return (
    <div className="w-full overflow-x-auto">

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[650px] w-full"
      >

        {yLabels.map(
          (line, index) => (
            <g key={index}>

              <line
                x1={
                  padding.left
                }
                x2={
                  width -
                  padding.right
                }
                y1={line.y}
                y2={line.y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              <text
                x={
                  padding.left -
                  10
                }
                y={
                  line.y + 4
                }
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
              >
                {formatNumber(
                  line.value
                )}
              </text>

            </g>
          )
        )}

        <line
          x1={padding.left}
          x2={
            width -
            padding.right
          }
          y1={
            height -
            padding.bottom
          }
          y2={
            height -
            padding.bottom
          }
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {mainPath && (
          <path
            d={mainPath}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {systolicPath && (
          <path
            d={systolicPath}
            fill="none"
            stroke="#0f766e"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {diastolicPath && (
          <path
            d={diastolicPath}
            fill="none"
            stroke="#64748b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {data.map(
          (item, index) => {
            const points =
              metric ===
              "blood_pressure"
                ? [
                    {
                      value:
                        item.systolic,
                      stroke:
                        "#0f766e",
                    },
                    {
                      value:
                        item.diastolic,
                      stroke:
                        "#64748b",
                    },
                  ]
                : [
                    {
                      value:
                        item.value,
                      stroke:
                        "#14b8a6",
                    },
                  ];

            return points.map(
              (
                point,
                pointIndex
              ) => {
                if (
                  point.value ===
                    null ||
                  point.value ===
                    undefined
                ) {
                  return null;
                }

                return (
                  <circle
                    key={`${index}-${pointIndex}`}
                    cx={getX(
                      index
                    )}
                    cy={getY(
                      point.value
                    )}
                    r="5"
                    fill="white"
                    stroke={
                      point.stroke
                    }
                    strokeWidth="3"
                  >
                    <title>
                      {formatChartDate(
                        item.date
                      )}{" "}
                      —{" "}
                      {formatNumber(
                        point.value
                      )}{" "}
                      {unit}
                    </title>
                  </circle>
                );
              }
            );
          }
        )}

        {data.map(
          (item, index) => {
            if (
              index %
                labelStep !==
                0 &&
              index !==
                data.length - 1
            ) {
              return null;
            }

            return (
              <text
                key={index}
                x={getX(
                  index
                )}
                y={
                  height - 20
                }
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {formatChartDate(
                  item.date
                )}
              </text>
            );
          }
        )}

        {metric ===
          "blood_pressure" && (
          <g
            transform={`translate(${padding.left}, 10)`}
          >
            <circle
              cx="5"
              cy="0"
              r="4"
              fill="#0f766e"
            />

            <text
              x="15"
              y="4"
              fontSize="10"
              fill="#475569"
            >
              Systolic
            </text>

            <circle
              cx="90"
              cy="0"
              r="4"
              fill="#64748b"
            />

            <text
              x="100"
              y="4"
              fontSize="10"
              fill="#475569"
            >
              Diastolic
            </text>
          </g>
        )}

      </svg>

    </div>
  );
}

/* ===============================================================
   HELPERS
   =============================================================== */

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "—";
  }

  const number =
    Number(value);

  return Number.isInteger(
    number
  )
    ? String(number)
    : number.toFixed(1);
}

function formatChartDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Date(
      value
    ).toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short",
      }
    );
  } catch {
    return "";
  }
}