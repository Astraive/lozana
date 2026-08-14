import { ApiError } from "./errors";
import { getApiKey } from "@/lib/env";

const DEFAULT_TIMEOUT_MS = 30_000;

function getApiUrl(): string {
  return localStorage.getItem("loza-collector-url") || import.meta.env.VITE_LOZANA_API_URL || "";
}

function buildHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };
  const key = getApiKey();
  if (key) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const signal = init?.signal;
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers: buildHeaders(init),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(`HTTP ${res.status}: ${body}`, res.status, body);
    }
    return res.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  return fetchJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function collectorURL(): string {
  return getApiUrl();
}
