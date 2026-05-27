import { ApiError } from "./errors";

const API_URL = import.meta.env.VITE_LOXANA_API_URL || "";
const API_KEY = import.meta.env.VITE_LOXA_API_KEY || "";

function buildHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };
  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }
  return headers;
}

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(`HTTP ${res.status}: ${body}`, res.status, body);
  }
  return res.json() as Promise<T>;
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  return fetchJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const collectorURL = API_URL;
