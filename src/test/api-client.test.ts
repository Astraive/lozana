import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchJSON, postJSON, resolveCollectorPath, getCollectorUrl, getCortexUrl } from "@/lib/api/client";
import { listDatabaseConnections, queryDatabase } from "@/lib/api/events";
import { queryClient, scopedQueryKey } from "@/lib/query-client";
import {
  migratePersistedAppState,
  selectPersistedAppState,
  useAppStore,
} from "@/stores/app.store";

describe("API Client & Scoped Routing", () => {
  beforeEach(() => {
    queryClient.clear();
    useAppStore.setState({
      collectorUrl: "http://localhost:9308",
      cortexUrl: "http://localhost:9312",
      activeCollector: "",
      activeEnvironment: "all",
      apiKey: "",
      queryScopeRevision: 0,
    });
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
    const state = { ...useAppStore.getState(), apiKey: "lz_secret" };

    expect(selectPersistedAppState(state)).not.toHaveProperty("apiKey");
    expect(migratePersistedAppState({ theme: "light", apiKey: "legacy_secret" })).not.toHaveProperty(
      "apiKey"
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
});
