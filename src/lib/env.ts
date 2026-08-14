export function getApiUrl(): string {
  return localStorage.getItem("loza-collector-url") || import.meta.env.VITE_LOZANA_API_URL || "";
}
export const wsUrl: string = import.meta.env.VITE_LOZANA_WS_URL || "";
export function getApiKey(): string {
  const storedKey = localStorage.getItem("loza-api-key");
  if (storedKey) {
    sessionStorage.setItem("loza-api-key", storedKey);
    localStorage.removeItem("loza-api-key");
  }
  return sessionStorage.getItem("loza-api-key") || import.meta.env.VITE_LOZA_API_KEY || "";
}
