import { readStoredValue } from "./storage";

export function getApiUrl(): string {
  return readStoredValue("loza-collector-url") || import.meta.env.VITE_LOZANA_API_URL || "";
}
export const wsUrl: string = import.meta.env.VITE_WS_URL || "";

// Single source of truth for the API key lives in the API client. Re-exported
// here so existing imports from this module keep working without a second
// (previously destructive) implementation.
export { getApiKey } from "./api/client";
