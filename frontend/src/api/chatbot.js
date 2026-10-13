import apiClient from "./client";
export const sendChatMessage=(message,language="English")=>apiClient.post("/chatbot/message",{message,language});
export const sendMessage=({message,language="English"})=>apiClient.post("/chatbot/message",{message,language});
export const getChatHistory=()=>apiClient.get("/chatbot/history");
