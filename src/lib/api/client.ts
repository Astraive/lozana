import { ApiError } from "./errors";
import { useAppStore } from "@/stores/app.store";

const DEFAULT_TIMEOUT_MS = 30_000;

function generateRequestId(): string {
  return "req_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

export function getCollectorUrl(): string {
  try {
    const storeUrl = useAppStore.getState().collectorUrl;
    if (storeUrl) return storeUrl;
  } catch {
    // fallback outside react context
  }
  return (
    (typeof window !== "undefined" ? localStorage.getItem("loza-collector-url") : null) ||
    (import.meta.env.VITE_LOZANA_API_URL as string) ||
    "http://localhost:9308"
  );
}

export function getCortexUrl(): string {
  try {
    const storeUrl = useAppStore.getState().cortexUrl;
    if (storeUrl) return storeUrl;
  } catch {
    // fallback
  }
  return (
    (typeof window !== "undefined" ? localStorage.getItem("loza-cortex-url") : null) ||
    (import.meta.env.VITE_CORTEX_URL as string) ||
    "http://localhost:9312"
  );
}

export function getWebSocketUrl(): string {
  try {
    const storeUrl = useAppStore.getState().wsUrl;
    if (storeUrl) return storeUrl;
  } catch {
    // fallback outside react context
  }
  return (
    (typeof window !== "undefined" ? localStorage.getItem("loza-ws-url") : null) ||
    (import.meta.env.VITE_WS_URL as string) ||
    "ws://localhost:9308/ws/tail"
  );
}

export function getActiveCollector(): string {
  try {
    return useAppStore.getState().activeCollector || "";
  } catch {
    return "";
  }
}

export function getActiveEnvironment(): string {
  try {
    return useAppStore.getState().activeEnvironment || "all";
  } catch {
    return "all";
  }
}

export function getApiKey(): string {
  try {
    const storeKey = useAppStore.getState().apiKey;
    if (storeKey) return storeKey;
  } catch {
    // fallback
  }
  return (typeof window !== "undefined" ? sessionStorage.getItem("loza-api-key") : null) || "";
}

/**
 * Resolves scoped collector paths:
 * If activeCollector is "edge-1" and path is "/lql/query", returns "/collectors/edge-1/lql/query".
 * If path already starts with "/collectors/" or is unscoped/global like "/health", leaves it as is.
 */
export function resolveCollectorPath(path: string): string {
  const collector = getActiveCollector();
  if (!collector) {
    return path;
  }
  if (path.startsWith("/collectors/")) {
    return path;
  }
  // Scoped routes
  if (
    path.startsWith("/lql/query") ||
    path.startsWith("/schema") ||
    path.startsWith("/status") ||
    path.startsWith("/events") ||
    path.startsWith("/sinks") ||
    path.startsWith("/tail")
  ) {
    return `/collectors/${encodeURIComponent(collector)}${path}`;
  }
  return path;
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Request-Id", generateRequestId());

  const key = getApiKey();
  if (key) {
    headers.set("Authorization", `Bearer ${key}`);
  }

  const env = getActiveEnvironment();
  if (env && env !== "all") {
    headers.set("X-Loza-Env", env);
  }

  const collector = getActiveCollector();
  if (collector) {
    headers.set("X-Loza-Collector", collector);
  }

  return headers;
}

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const signal = init?.signal;
  const abortRequest = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    abortRequest();
  } else {
    signal?.addEventListener("abort", abortRequest, { once: true });
  }

  const resolvedPath = resolveCollectorPath(path);
  const baseUrl = getCollectorUrl().replace(/\/+$/, "");

  try {
    const res = await fetch(`${baseUrl}${resolvedPath}`, {
      ...init,
      headers: buildHeaders(init),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
      throw new ApiError(`HTTP ${res.status}: ${typeof parsedBody === "object" && parsedBody !== null && "error" in (parsedBody as Record<string, unknown>) ? String((parsedBody as Record<string, unknown>).error) : body}`, res.status, body);
    }
    return res.json() as Promise<T>;
  } finally {
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortRequest);
  }
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  return fetchJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function collectorURL(): string {
  return getCollectorUrl();
}

/**
 * Cortex intelligence API client helpers
 */
export async function fetchCortexJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const signal = init?.signal;
  const abortRequest = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    abortRequest();
  } else {
    signal?.addEventListener("abort", abortRequest, { once: true });
  }

  const baseUrl = getCortexUrl().replace(/\/+$/, "");

  try {
    const res = await fetch(`${baseUrl}${path}`, {
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
    globalThis.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortRequest);
  }
}

export async function postCortexJSON<T>(path: string, body: unknown): Promise<T> {
  return fetchCortexJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function testCollectorConnection(): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  const baseUrl = getCollectorUrl().replace(/\/+$/, "");
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      status: 0,
      latencyMs,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export async function testCortexConnection(): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  const baseUrl = getCortexUrl().replace(/\/+$/, "");
  try {
    // Try healthz or root
    const res = await fetch(`${baseUrl}/healthz`, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      status: 0,
      latencyMs,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
