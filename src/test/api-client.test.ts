import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchJSON,
  postJSON,
  resolveCollectorPath,
  getCollectorUrl,
  getCortexUrl,
  fetchCortexJSON,
  postCortexJSON,
  testCollectorConnection,
  testCortexConnection,
  validateBaseUrl,
  isCredentialSafeTarget,
} from "@/lib/api/client";
  resolveCollectorPath,
  getCollectorUrl,
  getCortexUrl,
} from "@/lib/api/client";
import { isAuthenticated } from "@/lib/auth/auth.client";
import { listDatabaseConnections, queryDatabase } from "@/lib/api/events";
import { queryClient, scopedQueryKey } from "@/lib/query-client";
import {
  migratePersistedAppState,
  selectPersistedAppState,
  useAppStore,
} from "@/stores/app.store";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
  };
}

describe("API Client & Scoped Routing", () => {
  beforeEach(() => {
    queryClient.clear();
    useAppStore.setState({
      collectorUrl: "http://localhost:9308",
      cortexUrl: "http://localhost:9312",
      activeCollector: "",
      activeEnvironment: "all",
      apiKey: "",
      cortexApiKey: "",
      queryScopeRevision: 0,
    });
    vi.stubGlobal("sessionStorage", createMemoryStorage());
    vi.restoreAllMocks();
  });

  it("returns base URL defaults correctly", () => {
    expect(getCollectorUrl()).toBe("http://localhost:9308");
    expect(getCortexUrl()).toBe("http://localhost:9312");
  });

  it("resolves unscoped path when no active collector is set", () => {
    expect(resolveCollectorPath("/lql/query")).toBe("/lql/query");
    expect(resolveCollectorPath("/database/connections")).toBe("/database/connections");
    expect(resolveCollectorPath("/schema")).toBe("/schema");
    expect(resolveCollectorPath("/status")).toBe("/status");
  });

  it("resolves scoped collector path when active collector is set", () => {
    useAppStore.setState({ activeCollector: "edge-us-east" });

    expect(resolveCollectorPath("/lql/query")).toBe("/collectors/edge-us-east/lql/query");
    expect(resolveCollectorPath("/database/query")).toBe("/collectors/edge-us-east/database/query");
    expect(resolveCollectorPath("/schema")).toBe("/collectors/edge-us-east/schema");
    expect(resolveCollectorPath("/status")).toBe("/collectors/edge-us-east/status");
    expect(resolveCollectorPath("/tail")).toBe("/collectors/edge-us-east/tail");
  });

  it("does not double-prefix already scoped paths", () => {
    useAppStore.setState({ activeCollector: "edge-us-east" });
    expect(resolveCollectorPath("/collectors/other/lql/query")).toBe("/collectors/other/lql/query");
  });

  it("removes scoped cache data and advances a non-secret key when the scope changes", () => {
    queryClient.setQueryData(scopedQueryKey(0, "events", "recent"), { rows: ["tenant-a"] });
    queryClient.setQueryData(["local-preference"], "keep");

    useAppStore.getState().setApiKey("lz_secret_tenant_b");

    const revision = useAppStore.getState().queryScopeRevision;
    expect(revision).toBe(1);
    expect(queryClient.getQueryData(scopedQueryKey(0, "events", "recent"))).toBeUndefined();
    expect(queryClient.getQueryData(["local-preference"])).toBe("keep");
    expect(scopedQueryKey(revision, "events", "recent")).not.toContain("lz_secret_tenant_b");
  });

  it("keeps scoped cache data when a normalized setting is unchanged", () => {
    queryClient.setQueryData(scopedQueryKey(0, "collector", "health"), { status: "ok" });

    useAppStore.getState().setCollectorUrl("http://localhost:9308/");

    expect(useAppStore.getState().queryScopeRevision).toBe(0);
    expect(queryClient.getQueryData(scopedQueryKey(0, "collector", "health"))).toEqual({ status: "ok" });
  });

  it("excludes API credentials from durable Zustand state", async () => {
    const state = { ...useAppStore.getState(), apiKey: "lz_secret", cortexApiKey: "cx_secret" };

    expect(selectPersistedAppState(state)).not.toHaveProperty("apiKey");
    expect(selectPersistedAppState(state)).not.toHaveProperty("cortexApiKey");
    expect(migratePersistedAppState({ theme: "light", apiKey: "legacy_secret", cortexApiKey: "legacy_cx" })).not.toHaveProperty(
      "apiKey"
    );
    expect(migratePersistedAppState({ theme: "light", cortexApiKey: "legacy_cx" })).not.toHaveProperty(
      "cortexApiKey"
    );
  });

  it("sets JSON content type only for requests with a body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await fetchJSON("/health");
    await postJSON("/query", { query: "from events" });

    const getHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    const postHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(getHeaders.has("Content-Type")).toBe(false);
    expect(postHeaders.get("Content-Type")).toBe("application/json");
  });

  it("uses scoped database endpoints and never serializes credentials", async () => {
    useAppStore.setState({ activeCollector: "edge-us-east", activeDatabaseConnection: "analytics" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ connections: [{ name: "analytics", backend: "postgres", capabilities: [], enabled: true, primary: true, health: "healthy" }] }),
    } as Response);
    const connections = await listDatabaseConnections();
    expect(connections[0]?.name).toBe("analytics");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/collectors/edge-us-east/database/connections");
    expect(JSON.stringify(connections)).not.toContain("password");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ connection: "analytics", backend: "postgres", columns: [], rows: [], row_count: 0, duration_ms: 1 }),
    } as Response);
    await queryDatabase("from events | take 1", {}, 1, "analytics");
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.connection).toBe("analytics");
    expect(body.dsn).toBeUndefined();
  });

  it("removes reusable abort signal listeners after a completed request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");

    await fetchJSON("/health", { signal: controller.signal });

    const abortListener = add.mock.calls.find(([event]) => event === "abort")?.[1];
    expect(abortListener).toBeDefined();
    expect(remove).toHaveBeenCalledWith("abort", abortListener);
  });

  describe("per-service credential scoping", () => {
    const okResponse = { ok: true, json: async () => ({ ok: true }) } as Response;

    it("never forwards the collector key to the Cortex service", async () => {
      useAppStore.setState({ apiKey: "lz_collector_secret" });
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse);

      await fetchCortexJSON("/graph/service");
      await postCortexJSON("/reconstruct", { incident_id: "inc-1" });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      for (const call of fetchMock.mock.calls) {
        const headers = new Headers(call[1]?.headers);
        expect(headers.has("Authorization")).toBe(false);
        expect(headers.has("X-Loza-Collector")).toBe(false);
        expect(headers.has("X-Loza-Env")).toBe(false);
      }
    });

    it("keeps the collector key on collector requests", async () => {
      useAppStore.setState({ apiKey: "lz_collector_secret", activeCollector: "edge-1" });
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse);

      await fetchJSON("/health");

      const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
      expect(headers.get("Authorization")).toBe("Bearer lz_collector_secret");
      expect(headers.get("X-Loza-Collector")).toBe("edge-1");
    });

    it("drops a caller-supplied bearer header before calling Cortex", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse);

      await fetchCortexJSON("/incidents", { headers: { Authorization: "Bearer lz_collector_secret" } });

      const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
      expect(headers.has("Authorization")).toBe(false);
    });

    it("uses only a distinct Cortex token for Cortex requests", async () => {
      useAppStore.setState({ apiKey: "lz_collector_secret" });
      sessionStorage.setItem("loza-cortex-api-key", "cortex_only_token");
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse);

      await fetchCortexJSON("/incidents");
      await fetchJSON("/health");

      const cortexHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
      const collectorHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
      expect(cortexHeaders.get("Authorization")).toBe("Bearer cortex_only_token");
      expect(collectorHeaders.get("Authorization")).toBe("Bearer lz_collector_secret");
    });

    it("does not attach the collector key to Cortex connection tests", async () => {
      useAppStore.setState({ apiKey: "lz_collector_secret" });
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse);

      await testCortexConnection();
      await testCollectorConnection();

      expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).has("Authorization")).toBe(false);
      expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("Authorization")).toBe(
        "Bearer lz_collector_secret"
      );
    });
  });

  describe("endpoint URL validation", () => {
    it("rejects unsafe or untrusted configured base URLs", () => {
      expect(() => validateBaseUrl("javascript:alert(1)")).toThrow();
      expect(() => validateBaseUrl("data:text/html,hi")).toThrow();
      expect(() => validateBaseUrl("https://user:pass@collector.example.com")).toThrow();
      expect(() => validateBaseUrl("http://attacker.example.com")).toThrow();
      expect(validateBaseUrl("http://localhost:9308").hostname).toBe("localhost");
    });

    it("discards a tampered stored URL instead of using it as a request target", () => {
      useAppStore.setState({ collectorUrl: "javascript:alert(1)" });
      expect(getCollectorUrl()).toBe("http://localhost:9308");
    });

    it("withholds bearer credentials from plaintext non-loopback targets", () => {
      expect(isCredentialSafeTarget("http://localhost:9308")).toBe(true);
      expect(isCredentialSafeTarget("https://collector.example.com")).toBe(true);
      expect(isCredentialSafeTarget("http://attacker.example.com")).toBe(false);
      expect(isCredentialSafeTarget("not-a-url")).toBe(false);
    });
  });
});

describe("Cross-service header isolation", () => {
  beforeEach(() => {
    queryClient.clear();
    useAppStore.setState({
      collectorUrl: "http://localhost:9308",
      cortexUrl: "http://localhost:9312",
      activeCollector: "",
      activeEnvironment: "all",
      apiKey: "",
      cortexApiKey: "",
      queryScopeRevision: 0,
    });
    vi.restoreAllMocks();
  });

  const okResponse = () => ({ ok: true, json: async () => ({ ok: true }) } as Response);

  it("attaches the collector key and tenancy headers to collector requests", async () => {
    useAppStore.setState({
      apiKey: "lz_collector_secret",
      activeCollector: "edge-us-east",
      activeEnvironment: "production",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse());

    await fetchJSON("/status");

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer lz_collector_secret");
    expect(headers.get("X-Loza-Env")).toBe("production");
    expect(headers.get("X-Loza-Collector")).toBe("edge-us-east");
    expect(headers.get("X-Request-Id")).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("http://localhost:9308");
  });

  it("never forwards the collector key or tenancy headers to Cortex", async () => {
    useAppStore.setState({
      apiKey: "lz_collector_secret",
      activeCollector: "edge-us-east",
      activeEnvironment: "production",
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse());

    await fetchCortexJSON("/incidents");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(String(url)).toContain("http://localhost:9312");
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("X-Loza-Env")).toBeNull();
    expect(headers.get("X-Loza-Collector")).toBeNull();
    expect(headers.get("X-Request-Id")).toBeTruthy();
    expect(JSON.stringify(Object.fromEntries(headers))).not.toContain("lz_collector_secret");
  });

  it("uses a separate Cortex credential without leaking it to the collector", async () => {
    useAppStore.setState({ apiKey: "lz_collector_secret", cortexApiKey: "cx_secret" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse());

    await postCortexJSON("/reconstruct", { incident_id: "inc-1" });
    const cortexHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(cortexHeaders.get("Authorization")).toBe("Bearer cx_secret");
    expect(cortexHeaders.get("Content-Type")).toBe("application/json");

    await fetchJSON("/status");
    const collectorHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(collectorHeaders.get("Authorization")).toBe("Bearer lz_collector_secret");
    expect(collectorHeaders.get("Authorization")).not.toContain("cx_secret");
  });

  it("keeps collector credentials out of the Cortex connection test", async () => {
    useAppStore.setState({ apiKey: "lz_collector_secret" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okResponse());

    await testCortexConnection();
    const cortexHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(cortexHeaders.get("Authorization")).toBeNull();

    await testCollectorConnection();
    const collectorHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(collectorHeaders.get("Authorization")).toBe("Bearer lz_collector_secret");
  });

  it("gates on the collector credential only, not the Cortex credential", () => {
    useAppStore.setState({ apiKey: "", cortexApiKey: "" });
    expect(isAuthenticated()).toBe(false);

    useAppStore.setState({ cortexApiKey: "cx_secret" });
    expect(isAuthenticated()).toBe(false);

    useAppStore.setState({ apiKey: "lz_collector_secret" });
    expect(isAuthenticated()).toBe(true);
  });
});
