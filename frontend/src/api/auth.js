import apiClient from "./client";

// Generic auth
export const register = (payload) => apiClient.post("/auth/register", payload);
export const login = (payload) => apiClient.post("/auth/login", payload);
export const getMe = () => apiClient.get("/auth/me");

// Dedicated Role Flows
export const patientLogin = (payload) => apiClient.post("/auth/patient/login", payload);
export const patientRegister = (payload) => apiClient.post("/auth/patient/register", payload);
export const doctorLogin = (payload) => apiClient.post("/auth/doctor/login", payload);
export const doctorRegister = (payload) => apiClient.post("/auth/doctor/register", payload);

// Password Reset & Security
export const requestPasswordReset = (email) => apiClient.post("/auth/forgot-password", { email });
export const verifyResetOtp = (email, otp) => apiClient.post("/auth/verify-reset-otp", { email, otp });
export const resetPassword = (email, reset_token, new_password) =>
  apiClient.post("/auth/reset-password", { email, reset_token, new_password });
export const checkEmailSecurity = () => apiClient.get("/auth/security/breach-check");
export const updateProfile = (payload) => apiClient.put("/users/me", payload);
export const updatePassword = (payload) => apiClient.put("/users/me/password", payload);
