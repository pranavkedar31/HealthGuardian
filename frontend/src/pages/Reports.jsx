import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Page from "../components/Page";
import Card from "../components/Card";
import Icon from "../components/Icon";
import * as api from "../api/reports";
import { prettyDate } from "../utils/format";

function renderSummary(summary) {
  if (!summary) {
    return (
      <p className="text-xs leading-6 text-slate-500">
        No AI summary is available for this report yet.
      </p>
    );
  }

  const sections = summary
    .split(/^##\s+/m)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length <= 1) {
    return (
      <p className="whitespace-pre-line text-xs leading-6 text-slate-600 dark:text-slate-300">
        {summary}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const lines = section.split("\n");
        const title = lines[0]?.trim();
        const content = lines.slice(1);

        return (
          <div
            key={`${title}-${index}`}
            className="rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/70 p-4"
          >
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {title}
            </h4>

            <div className="mt-2 space-y-1.5">
              {content.map((line, lineIndex) => {
                const cleanLine = line.trim();

                if (!cleanLine) return null;

                const isBullet =
                  cleanLine.startsWith("- ") ||
                  cleanLine.startsWith("* ") ||
                  cleanLine.startsWith("• ");
                const bulletText = isBullet ? cleanLine.slice(2).trim() : cleanLine;

                if (isBullet) {
                  return (
                    <div
                      key={lineIndex}
                      className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                      <span
                        dangerouslySetInnerHTML={{
                          __html: bulletText.replace(
                            /\*\*(.*?)\*\*/g,
                            "<strong>$1</strong>"
                          ),
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <p
                    key={lineIndex}
                    className="text-xs leading-6 text-slate-600 dark:text-slate-300"
                    dangerouslySetInnerHTML={{
                      __html: cleanLine.replace(
                        /\*\*(.*?)\*\*/g,
                        "<strong>$1</strong>"
                      ),
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reanalyzingId, setReanalyzingId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.getReportHistory();
      const list = Array.isArray(r.data) ? r.data : [];
      setItems(list);
      return list;
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    e.preventDefault();

    if (!file) return;

    setBusy(true);
    setError("");

    try {
      const res = await api.uploadReport(file);
      if (res?.data) {
        setItems((prev) => [res.data, ...prev.filter((x) => x.id !== res.data.id)]);
      }
      setFile(null);
      e.target.reset();
      await load();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to upload and analyze the report."
      );
    } finally {
      setBusy(false);
    }
  };

  const reanalyze = async (id) => {
    setReanalyzingId(id);
    try {
      const res = await api.reanalyzeReport(id);
      if (res?.data) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? res.data : item))
        );
      }
    } catch {
      setError("Unable to re-analyze report.");
    } finally {
      setReanalyzingId(null);
    }
  };

  const download = async (id) => {
    try {
      const r = await api.downloadReportPdf(id);

      const url = URL.createObjectURL(
        new Blob([r.data], {
          type: "application/pdf",
        })
      );

      const a = document.createElement("a");
      a.href = url;
      a.download = `healthguardian-report-${id}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download this report.");
    }
  };

  const reportCount = items.length;

  return (
    <>
      <Navbar />

      <Page
        title="Medical Reports"
        subtitle="Upload reports, review AI summaries and keep your health documents organized in one place."
        action={
          <div className="badge bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            <Icon name="file" size={14} />
            Secure workspace
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.4fr]">
          {/* Upload */}
          <Card
            title="Analyze a report"
            subtitle="Upload a supported medical document (PDF, PNG, JPG)."
            accent
          >
            <form
              onSubmit={upload}
              className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-7 text-center transition hover:border-teal-300"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <Icon name="file" size={30} />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                Drop your report here
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                HealthGuardian extracts clinical markers and generates an AI summary from digital PDFs and photos.
              </p>

              <input
                className="mx-auto mt-5 block max-w-full text-xs text-slate-600 dark:text-slate-400"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
              />

              {file && (
                <div className="mt-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 px-3 py-2 text-xs font-bold text-teal-800 dark:text-teal-300">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}

              <button
                className="btn-primary mt-5 w-full"
                disabled={!file || busy}
              >
                {busy ? "Extracting & analyzing with AI..." : "Upload & analyze"}
                <Icon name="spark" size={16} />
              </button>

              {error && (
                <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </form>

            <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-4 text-xs leading-5 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40">
              <b>Important:</b> AI summaries are explanations, not medical diagnoses. Always review raw findings with your physician.
            </div>
          </Card>

          {/* Reports */}
          <Card
            title="Your report library"
            subtitle={
              loading
                ? "Loading reports from your account..."
                : `${reportCount} report${reportCount === 1 ? "" : "s"} in your account.`
            }
            action={
              <span className="badge bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <Icon name="file" size={13} />
                {loading ? "Loading..." : `${reportCount} Total`}
              </span>
            }
          >
            <div className="space-y-4">
              {loading && !items.length && (
                <div className="space-y-3">
                  <div className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                  <div className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                </div>
              )}

              {items.map((r) => (
                <article
                  key={r.id}
                  className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4">
                    {/* Report header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-teal-300">
                            <Icon name="file" size={17} />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                              {r.original_filename || "Medical report"}
                            </div>

                            <div className="text-[10px] text-slate-400">
                              {prettyDate(r.created_at)}
                              {r.report_type
                                ? ` · ${r.report_type}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(!r.ai_summary || r.ai_summary.includes("No readable text") || r.ai_summary.includes("No text extracted")) && (
                          <button
                            className="btn-secondary text-xs py-1.5 px-3"
                            onClick={() => reanalyze(r.id)}
                            disabled={reanalyzingId === r.id}
                          >
                            {reanalyzingId === r.id ? "Analyzing..." : "Re-analyze"}
                            <Icon name="spark" size={13} />
                          </button>
                        )}

                        <button
                          className="btn-secondary w-fit shrink-0 py-1.5 px-3"
                          onClick={() => download(r.id)}
                        >
                          PDF
                          <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* AI summary */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                          <Icon name="spark" size={14} />
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          AI Report Summary
                        </h3>
                      </div>

                      {renderSummary(r.ai_summary)}
                    </div>
                  </div>
                </article>
              ))}

              {!loading && !items.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  No reports uploaded yet. Your analyzed documents will appear here.
                </div>
              )}
            </div>
          </Card>
        </div>
      </Page>
    </>
  );
}