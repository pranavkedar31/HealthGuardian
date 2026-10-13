import apiClient from "./client";

export const getHealthProfile = () => apiClient.get("/health-profile");
export const createHealthProfile = (payload) => apiClient.post("/health-profile", payload);
export const updateHealthProfile = (payload) => apiClient.put("/health-profile", payload);

export const checkSymptoms = (payload) => apiClient.post("/symptoms/check", payload);
export const getSymptomHistory = () => apiClient.get("/symptoms/history");

export const predictRisk = (payload) => apiClient.post("/predictions/risk", payload);
export const calculateBMI = (payload) => apiClient.post("/predictions/bmi", payload);

export const generateDietPlan = (payload) => apiClient.post("/diet/generate", payload);
export const getDietHistory = () => apiClient.get("/diet/history");

export const generateWorkoutPlan = (payload) => apiClient.post("/workout/generate", payload);
export const getWorkoutHistory = () => apiClient.get("/workout/history");
export const getVitals = () => apiClient.get("/vitals");
export const createVital = (payload) => apiClient.post("/vitals", payload);
