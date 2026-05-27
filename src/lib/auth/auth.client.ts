import { apiKey } from "../env";

/**
 * Returns Authorization headers if an API key is configured.
 */
export function getAuthHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}

/**
 * Returns true if an API key is configured (user is "authenticated").
 */
export function isAuthenticated(): boolean {
  return apiKey.length > 0;
}
