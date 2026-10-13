import apiClient from "./client";

export const uploadReport = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", localStorage.getItem("hg_language") || "English");
  return apiClient.post("/reports/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getReportHistory = () => apiClient.get("/reports/history");

export const reanalyzeReport = (reportId, language) =>
  apiClient.post(`/reports/${reportId}/reanalyze`, null, {
    params: { language: language || localStorage.getItem("hg_language") || "English" },
  });

export const downloadReportPdf = (reportId) =>
  apiClient.get(`/reports/${reportId}/pdf`, { responseType: "blob" });

export const getReportSummaryInLanguage = (reportId, language) =>
  apiClient.get(`/reports/${reportId}/summary`, { params: { language } });
