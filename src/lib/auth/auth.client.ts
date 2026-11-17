import { getApiKey } from "../api/client";
import { getApiKey } from "@/lib/api/client";

/**
 * Returns Authorization headers for collector requests if a collector API key
 * is configured. Never use this for Cortex (a separate trust domain).
 */
export function getAuthHeaders(): Record<string, string> {
  const key = getApiKey();
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

/**
 * Returns true if a collector API key is configured (user is "authenticated").
 * The backend remains authoritative for validating the key; this is used only
 * for client-side route gating (defense in depth).
 */
export function isAuthenticated(): boolean {
  return getApiKey().length > 0;
}
