import { describe, it, expect, beforeEach } from "vitest";
import { resolveCollectorPath, getCollectorUrl, getCortexUrl } from "@/lib/api/client";
import { queryClient, scopedQueryKey } from "@/lib/query-client";
import { useAppStore } from "@/stores/app.store";

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
  });

  it("returns base URL defaults correctly", () => {
    expect(getCollectorUrl()).toBe("http://localhost:9308");
    expect(getCortexUrl()).toBe("http://localhost:9312");
  });

  it("resolves unscoped path when no active collector is set", () => {
    expect(resolveCollectorPath("/lql/query")).toBe("/lql/query");
    expect(resolveCollectorPath("/schema")).toBe("/schema");
    expect(resolveCollectorPath("/status")).toBe("/status");
  });

  it("resolves scoped collector path when active collector is set", () => {
    useAppStore.setState({ activeCollector: "edge-us-east" });

    expect(resolveCollectorPath("/lql/query")).toBe("/collectors/edge-us-east/lql/query");
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
});
