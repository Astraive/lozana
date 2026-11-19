import { ApiError } from "./errors";
import { readStoredValue } from "../storage";
import { validateEndpointUrl, type EndpointPurpose } from "./endpoint-policy";
import { useAppStore } from "@/stores/app.store";

const DEFAULT_TIMEOUT_MS = 30_000;

function generateRequestId(): string {
  return "req_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function normalizedOriginKey(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const port = url.port || (url.protocol === "https:" || url.protocol === "wss:" ? "443" : "80");
  return `${host}:${port}`;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^127(?:\.\d{1,3}){3}$/.test(host) ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host === "::ffff:127.0.0.1"
  );
}

/**
 * Origins that may be used as an HTTP endpoint. Same-origin, the build-time
 * configured service URLs and VITE_LOZANA_ALLOWED_ORIGINS are trusted; any
 * other non-loopback value written to localStorage is discarded.
 */
function allowedOriginKeys(): Set<string> {
  const keys = new Set<string>();
  const add = (value: string | null | undefined): void => {
    if (!value) return;
    try {
      keys.add(normalizedOriginKey(new URL(value)));
    } catch {
      // Ignore malformed entries.
    }
  };

  try {
    if (typeof window !== "undefined") add(window.location?.origin);
  } catch {
    // No browser location available.
  }
  add(import.meta.env.VITE_LOZANA_API_URL as string | undefined);
  add(import.meta.env.VITE_CORTEX_URL as string | undefined);
  for (const entry of String(
    (import.meta.env.VITE_LOZANA_ALLOWED_ORIGINS as string | undefined) ?? ""
  ).split(/[\s,]+/)) {
    add(entry);
  }
  return keys;
}

/** Validate/sanitize a configured HTTP base URL before it becomes a target. */
export function validateBaseUrl(rawUrl: string): URL {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error("Endpoint URL is required");
  }
  const url = new URL(rawUrl.trim());
  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Endpoint URL must use http or https; received ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error("Endpoint URL must not contain credentials");
  }
  if (!isLoopbackHost(url.hostname) && !allowedOriginKeys().has(normalizedOriginKey(url))) {
    throw new Error(`Endpoint origin ${normalizedOriginKey(url)} is not allowed`);
  }
  return url;
}

function resolveBaseUrl(
  candidates: readonly (string | null | undefined)[],
  fallback: string
): string {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") continue;
    const url = candidate.trim();
    try {
      validateBaseUrl(url);
      return url.replace(/\/+$/, "");
    } catch {
      // Reject malformed or untrusted configured URLs.
/**
 * Pick the first configured URL that passes policy. Values from localStorage
 * (or persisted store state) are untrusted, so an invalid entry is discarded
 * instead of being used as a request target.
 */
function resolveEndpoint(
  candidates: readonly (string | null | undefined)[],
  fallback: string,
  purpose: EndpointPurpose
): string {
  const requireTls = Boolean(getApiKey());
  for (const candidate of candidates) {
    if (!candidate) continue;
    const url = candidate.trim();
    try {
      validateEndpointUrl(url, { purpose, requireTls });
      return url;
    } catch {
      // Reject unsafe or malformed configuration.
    }
  }
  return fallback;
}

/** Bearer credentials may only be sent over TLS or to a local loopback host. */
export function isCredentialSafeTarget(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHost(url.hostname));
  } catch {
    return false;
  }
}

export function getCollectorUrl(): string {
  let storeUrl: string | null = null;
  try {
    storeUrl = useAppStore.getState().collectorUrl;
  } catch {
    // fallback outside react context
  }
  return resolveBaseUrl(
    [
      storeUrl,
      typeof localStorage !== "undefined" ? localStorage.getItem("loza-collector-url") : null,
      import.meta.env.VITE_LOZANA_API_URL as string | undefined,
    ],
  return (
    readStoredValue("loza-collector-url") ||
    (import.meta.env.VITE_LOZANA_API_URL as string) ||
    "http://localhost:9308"
  return resolveEndpoint(
    [
      storeUrl,
      typeof localStorage !== "undefined" ? localStorage.getItem("loza-collector-url") : null,
      import.meta.env.VITE_LOZANA_API_URL as string,
    ],
    "http://localhost:9308",
    "http"
  );
}

export function getCortexUrl(): string {
  let storeUrl: string | null = null;
  try {
    storeUrl = useAppStore.getState().cortexUrl;
  } catch {
    // fallback
  }
  return resolveBaseUrl(
    [
      storeUrl,
      typeof localStorage !== "undefined" ? localStorage.getItem("loza-cortex-url") : null,
      import.meta.env.VITE_CORTEX_URL as string | undefined,
    ],
  return (
    readStoredValue("loza-cortex-url") ||
    (import.meta.env.VITE_CORTEX_URL as string) ||
    "http://localhost:9312"
  return resolveEndpoint(
    [
      storeUrl,
      typeof localStorage !== "undefined" ? localStorage.getItem("loza-cortex-url") : null,
      import.meta.env.VITE_CORTEX_URL as string,
    ],
    "http://localhost:9312",
    "http"
  );
}

export function getWebSocketUrl(): string {
  let storeUrl: string | null = null;
  try {
    storeUrl = useAppStore.getState().wsUrl;
  } catch {
    // fallback outside react context
  }
  return (
    readStoredValue("loza-ws-url") ||
    (import.meta.env.VITE_WS_URL as string) ||
    "ws://localhost:9308/ws/tail"
  return resolveEndpoint(
    [
      storeUrl,
      typeof localStorage !== "undefined" ? localStorage.getItem("loza-ws-url") : null,
      import.meta.env.VITE_WS_URL as string,
    ],
    "ws://localhost:9308/ws/tail",
    "websocket"
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

/**
 * Single source of truth for the API key, shared by auth checks and all API
 * calls. This is a pure read: it never writes to or deletes from storage.
 */
export function getApiKey(): string {
  try {
    const storeKey = useAppStore.getState().apiKey;
    if (storeKey) return storeKey;
  } catch {
    // Store unavailable (e.g. outside React context / SSR); fall through.
  }
  return readStoredValue("loza-api-key", "session") ?? "";
}

/**
 * Cortex is a separate trust domain. Its credential (if any) is deliberately
 * distinct from the collector key so a collector secret is never forwarded to
 * the Cortex service. Set it via loza-cortex-api-key / VITE_CORTEX_API_KEY.
 */
export function getCortexApiKey(): string {
  return (
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loza-cortex-api-key") : null) ||
    (import.meta.env.VITE_CORTEX_API_KEY as string | undefined) ||
    ""
 * Cortex is a separate trust domain with its own credential. This key is
 * deliberately distinct from the collector key so collector secrets are never
 * forwarded to Cortex.
 */
export function getCortexApiKey(): string {
  try {
    const storeKey = useAppStore.getState().cortexApiKey;
    if (storeKey) return storeKey;
  } catch {
    // fallback
  }
  return (
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loza-cortex-api-key") : null) || ""
  );
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
    path.startsWith("/database") ||
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

/** Headers shared by every JSON request. No credential is attached here. */
/** Headers shared by every JSON request (no credentials attached here). */
function buildBaseHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Request-Id", generateRequestId());
  return headers;
}

/**
 * Collector-scoped headers. Only this builder attaches the collector API key
 * and the collector tenancy headers.
 */
function buildCollectorHeaders(init?: RequestInit): Headers {
  const headers = buildBaseHeaders(init);

function attachBearer(headers: Headers, token: string, baseUrl: string): void {
  if (!token || !isCredentialSafeTarget(baseUrl)) return;
  headers.set("Authorization", `Bearer ${token}`);
}

/**
 * Collector-scoped headers. Only these may carry the collector API key and
 * the collector tenancy headers, and only to a validated collector target.
 */
function buildCollectorHeaders(baseUrl: string, init?: RequestInit): Headers {
  const headers = buildBaseHeaders(init);
  attachBearer(headers, getApiKey(), baseUrl);
  const key = getApiKey();
  if (key) {
    // A bearer credential must never be attached to a plaintext remote URL.
    validateEndpointUrl(getCollectorUrl(), { purpose: "http", requireTls: true });
    validateEndpointUrl(getCortexUrl(), { purpose: "http", requireTls: true });
    validateEndpointUrl(getWebSocketUrl(), { purpose: "websocket", requireTls: true });
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

/**
 * Cortex-scoped headers. Cortex is a different trust domain: the collector key
 * and collector tenancy headers MUST NOT be forwarded to it.
 */
function buildCortexHeaders(baseUrl: string, init?: RequestInit): Headers {
  const headers = buildBaseHeaders(init);
  // A credential meant for the collector must never travel to Cortex.
  headers.delete("Authorization");
  attachBearer(headers, getCortexApiKey(), baseUrl);
 * and collector tenancy headers MUST NOT be forwarded to it. If Cortex needs
 * auth, it uses its own separate credential.
 */
function buildCortexHeaders(init?: RequestInit): Headers {
  const headers = buildBaseHeaders(init);

  const key = getCortexApiKey();
  if (key) {
    headers.set("Authorization", `Bearer ${key}`);
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
      headers: buildCollectorHeaders(baseUrl, init),
      headers: buildCollectorHeaders(init),
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
      headers: buildCortexHeaders(baseUrl, init),
      headers: buildCortexHeaders(init),
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

export async function testCollectorConnection(urlOverride?: string): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  // An explicit (unsaved draft) URL takes precedence over the saved setting.
  const baseUrl = (urlOverride?.trim() || getCollectorUrl()).replace(/\/+$/, "");
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: buildCollectorHeaders(baseUrl),
      headers: buildCollectorHeaders(),
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

export async function testCortexConnection(urlOverride?: string): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  // An explicit (unsaved draft) URL takes precedence over the saved setting.
  const baseUrl = (urlOverride?.trim() || getCortexUrl()).replace(/\/+$/, "");
  try {
    // Try healthz or root
    const res = await fetch(`${baseUrl}/healthz`, {
      method: "GET",
      headers: buildCortexHeaders(baseUrl),
      headers: buildCortexHeaders(),
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
