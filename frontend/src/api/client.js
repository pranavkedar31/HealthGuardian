import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PUBLIC_PATHS = [
  "/",
  "/patient/login",
  "/patient/register",
  "/doctor/login",
  "/doctor/register",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isIntegrationTest =
      requestUrl.includes("whatsapp") ||
      requestUrl.includes("test-whatsapp") ||
      requestUrl.includes("/health");

    if (error.response?.status === 401 && !isIntegrationTest) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      const currentPath = window.location.pathname;
      const isPublic = PUBLIC_PATHS.some(
        (p) => currentPath === p || (p !== "/" && currentPath.startsWith(p))
      );

      // Only redirect if user was on a protected route and their session expired
      if (!isPublic) {
        const isDoctorRoute = currentPath.startsWith("/doctor");
        const targetLogin = isDoctorRoute ? "/doctor/login" : "/patient/login";
        if (currentPath !== targetLogin) {
          window.location.href = targetLogin;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
