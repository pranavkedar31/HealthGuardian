import apiClient from "./client";
export const getIntegrationStatus=()=>apiClient.get("/integrations/status");
export const getWeather=(params)=>apiClient.get("/integrations/weather",{params});
export const getHealthNews=(params={})=>apiClient.get("/integrations/news",{params});
export const searchKnowledge=(params)=>apiClient.get("/integrations/knowledge",{params});

export const searchImage=(q)=>apiClient.get("/integrations/image-search",{params:{q}});
