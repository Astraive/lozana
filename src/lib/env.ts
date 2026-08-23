export function getApiUrl(): string {
  return localStorage.getItem("loza-collector-url") || import.meta.env.VITE_LOZANA_API_URL || "";
}
export const wsUrl: string = import.meta.env.VITE_WS_URL || "";
export function getApiKey(): string {
  localStorage.removeItem("loza-api-key");
  return sessionStorage.getItem("loza-api-key") || "";
}
