import apiClient from "./client";

export const searchDoctors = (params) => apiClient.get("/doctors", { params });
export const getSpecializations = () => apiClient.get("/doctors/specializations");
export const getDoctor = (id) => apiClient.get(`/doctors/${id}`);
export const getAvailableSlots = (id, date) =>
  apiClient.get(`/doctors/${id}/available-slots`, { params: { date } });
