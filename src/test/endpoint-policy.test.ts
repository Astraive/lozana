import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLoopbackHost,
  validateEndpointUrl,
  EndpointValidationError,
} from "@/lib/api/endpoint-policy";
import { fetchJSON, getCollectorUrl, getCortexUrl, getWebSocketUrl } from "@/lib/api/client";
import { migratePersistedAppState, useAppStore } from "@/stores/app.store";

function setAllowedOrigins(value?: string): void {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  if (!env) return;
  if (value === undefined) delete env.VITE_LOZANA_ALLOWED_ORIGINS;
  else env.VITE_LOZANA_ALLOWED_ORIGINS = value;
}

const DEFAULTS = {
  collectorUrl: "http://localhost:9308",
  cortexUrl: "http://localhost:9312",
  wsUrl: "ws://localhost:9308/ws/tail",
  apiKey: "",
  activeCollector: "",
  activeEnvironment: "all" as const,
};

describe("Endpoint URL policy", () => {
  beforeEach(() => {
    useAppStore.setState({ ...DEFAULTS });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    useAppStore.setState({ ...DEFAULTS });
    setAllowedOrigins(undefined);
  });

  it("recognizes loopback hosts", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("127.42.1.9")).toBe(true);
    expect(isLoopbackHost("[::1]")).toBe(true);
    expect(isLoopbackHost("collector.example.com")).toBe(false);
  });

  it("accepts plaintext URLs for loopback hosts only", () => {
    expect(validateEndpointUrl("http://localhost:9308", { purpose: "http" }).host).toBe(
      "localhost:9308"
    );
    expect(
      validateEndpointUrl("ws://127.0.0.1:9308/ws/tail", { purpose: "websocket" }).protocol
    ).toBe("ws:");

    expect(() =>
      validateEndpointUrl("http://collector.example.com", {
        purpose: "http",
        requireTls: true,
      })
    ).toThrow(EndpointValidationError);
    expect(() =>
      validateEndpointUrl("ws://collector.example.com/ws/tail", {
        purpose: "websocket",
        requireTls: true,
      })
    ).toThrow(/https:\/\/ or wss:\/\//);
  });

  it("rejects disallowed and malformed origins regardless of scheme", () => {
    expect(() =>
      validateEndpointUrl("https://attacker.example.com", { purpose: "http" })
    ).toThrow(/not in the allowed origin list/);
    expect(() => validateEndpointUrl("javascript:alert(1)", { purpose: "http" })).toThrow();
    expect(() =>
      validateEndpointUrl("https://user:pass@api.example.com", { purpose: "http" })
    ).toThrow(/must not contain credentials/);
  });

  it("accepts explicitly allowlisted secure origins", () => {
    setAllowedOrigins("https://api.example.com, https://cortex.example.com:9312");
    expect(() =>
      validateEndpointUrl("wss://api.example.com/ws/tail", {
        purpose: "websocket",
        requireTls: true,
      })
    ).not.toThrow();
    expect(() =>
      validateEndpointUrl("https://cortex.example.com:9312/healthz", {
        purpose: "http",
        requireTls: true,
      })
    ).not.toThrow();
  });

  it("rejects unsafe URLs in the settings store without persisting them", () => {
    useAppStore.setState({ apiKey: "lz_key" });

    expect(() => useAppStore.getState().setCollectorUrl("http://api.example.com")).toThrow(
      /https:\/\/ or wss:\/\//
    );
    expect(() => useAppStore.getState().setWsUrl("ws://api.example.com/ws/tail")).toThrow();
    expect(useAppStore.getState().collectorUrl).toBe(DEFAULTS.collectorUrl);
    expect(useAppStore.getState().wsUrl).toBe(DEFAULTS.wsUrl);

    expect(() => useAppStore.getState().setCollectorUrl("http://localhost:9309/")).not.toThrow();
    expect(useAppStore.getState().collectorUrl).toBe("http://localhost:9309");
  });

  it("drops tampered URLs from persisted state on migration", () => {
    const migrated = migratePersistedAppState({
      collectorUrl: "http://attacker.example.com",
      cortexUrl: "https://attacker.example.com",
      wsUrl: "ws://attacker.example.com/ws/tail",
      theme: "light",
    });

    expect(migrated.collectorUrl).toBe(DEFAULTS.collectorUrl);
    expect(migrated.cortexUrl).toBe(DEFAULTS.cortexUrl);
    expect(migrated.wsUrl).toBe(DEFAULTS.wsUrl);
    expect(JSON.stringify(migrated)).not.toContain("attacker.example.com");
  });
});

describe("Credential transport", () => {
  beforeEach(() => {
    useAppStore.setState({ ...DEFAULTS });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    useAppStore.setState({ ...DEFAULTS });
    setAllowedOrigins(undefined);
  });

  it("discards configured URLs that fail validation", () => {
    useAppStore.setState({
      collectorUrl: "http://attacker.example.com",
      cortexUrl: "http://attacker.example.com",
      wsUrl: "ws://attacker.example.com/ws/tail",
    });

    expect(getCollectorUrl()).toBe(DEFAULTS.collectorUrl);
    expect(getCortexUrl()).toBe(DEFAULTS.cortexUrl);
    expect(getWebSocketUrl()).toBe(DEFAULTS.wsUrl);
  });

  it("sends the bearer header over a validated secure endpoint", async () => {
    setAllowedOrigins("https://api.example.com");
    useAppStore.setState({
      apiKey: "lz_secret",
      collectorUrl: "https://api.example.com",
      cortexUrl: "https://api.example.com",
      wsUrl: "wss://api.example.com/ws/tail",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await fetchJSON("/health");

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer lz_secret");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.example.com/health");
  });

  it("never attaches a bearer credential to a plaintext non-loopback endpoint", async () => {
    useAppStore.setState({
      apiKey: "lz_secret",
      // setState bypasses the validating setter to simulate tampered storage.
      collectorUrl: "http://api.example.com",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await fetchJSON("/health");

    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("api.example.com");
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer lz_secret");
  });
});
