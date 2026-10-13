import apiClient from "./client";

export const listNotifications = (limit = 50) =>
  apiClient.get("/notifications", { params: { limit } });
export const markNotificationRead = (id) =>
  apiClient.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () =>
  apiClient.post("/notifications/mark-all-read");
