import apiClient from "./client";

export const listReminders = () => apiClient.get("/reminders");
export const createReminder = (payload) => apiClient.post("/reminders", payload);
export const updateReminder = (id, payload) => apiClient.put(`/reminders/${id}`, payload);
export const deleteReminder = (id) => apiClient.delete(`/reminders/${id}`);
export const markReminderTaken = (id) => apiClient.post(`/reminders/${id}/take`);
export const snoozeReminder = (id, minutes = 5) => apiClient.post(`/reminders/${id}/snooze?minutes=${minutes}`);
export const testWhatsAppNotification = (phoneNumber) =>
  apiClient.post("/reminders/test-whatsapp", { phone_number: phoneNumber });
export const getWhatsAppHealth = () => apiClient.get("/reminders/whatsapp/health");
