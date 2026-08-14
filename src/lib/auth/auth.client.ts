import { getApiKey } from "../env";

/**
 * Returns Authorization headers if an API key is configured.
 */
export function getAuthHeaders(): Record<string, string> {
  const key = getApiKey();
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

/**
 * Returns true if an API key is configured (user is "authenticated").
 */
export function isAuthenticated(): boolean {
  return getApiKey().length > 0;
}
