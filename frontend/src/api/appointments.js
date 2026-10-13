import apiClient from "./client";

export const listAppointments = () => apiClient.get("/appointments");
export const createAppointment = (payload) => apiClient.post("/appointments", payload);
export const updateAppointment = (id, payload) => apiClient.put(`/appointments/${id}`, payload);

export const listDoctorAppointments = () => apiClient.get("/doctor/appointments");
export const getDoctorStats = () => apiClient.get("/doctor/appointments/stats");
export const updateDoctorAppointment = (id, payload) => apiClient.put(`/doctor/appointments/${id}`, payload);
export const getDoctorProfile = () => apiClient.get("/doctor/profile");
export const updateDoctorProfile = (payload) => apiClient.put("/doctor/profile", payload);
