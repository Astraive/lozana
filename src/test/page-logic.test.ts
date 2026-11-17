import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  shouldSyncUrlQuery,
  resolveQueryError,
  errorMessage,
  isSinkHealthy,
  formatHealthMetric,
  isLatestRequest,
} from "@/lib/page-logic";
import { LqlQueryError } from "@/lib/api/events";
import { testCollectorConnection, testCortexConnection } from "@/lib/api/client";
import { useAppStore } from "@/stores/app.store";

describe("Explore URL -> tab sync (LOZ-BUG-003)", () => {
  it("syncs when a URL query is first present", () => {
    expect(shouldSyncUrlQuery("from events", null)).toBe(true);
  });

  it("syncs when the URL query changes via explicit navigation", () => {
    expect(shouldSyncUrlQuery("from events | take 5", "from events")).toBe(true);
  });

  it("does not sync when only the active tab changed (URL unchanged)", () => {
    // Regression: arriving with ?q=X then switching to a tab with query Y must
    // not overwrite Y with X.
    expect(shouldSyncUrlQuery("from events", "from events")).toBe(false);
  });

  it("does not sync an empty or whitespace-only URL query", () => {
    expect(shouldSyncUrlQuery("", null)).toBe(false);
    expect(shouldSyncUrlQuery("   ", "from events")).toBe(false);
  });
});

describe("Query failures are user-visible (LOZ-BUG-003)", () => {
  it("surfaces LQL diagnostics with the LQL title", () => {
    const error = new LqlQueryError("bad query", 400, [{ message: "unknown column" }]);
    expect(resolveQueryError(error)).toEqual({
      title: "LQL Diagnostic Errors",
      messages: ["unknown column"],
    });
  });

  it("falls back to the LQL message when no diagnostics are present", () => {
    expect(resolveQueryError(new LqlQueryError("compile failed", 400))).toEqual({
      title: "LQL Diagnostic Errors",
      messages: ["compile failed"],
    });
  });

  it("shows a generic error for network/abort failures instead of an empty result", () => {
    expect(resolveQueryError(new Error("Failed to fetch"))).toEqual({
      title: "Query failed",
      messages: ["Failed to fetch"],
    });
    expect(resolveQueryError("offline")).toEqual({
      title: "Query failed",
      messages: ["offline"],
    });
  });

  it("always returns a visible message for unknown failures and none for no error", () => {
    expect(resolveQueryError({})?.messages[0]).toBeTruthy();
    expect(resolveQueryError(null)).toBeNull();
  });

  it("formats unknown async error messages for page banners", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("oops")).toBe("oops");
    expect(errorMessage(null, "fallback")).toBe("fallback");
  });
});

describe("Health consistency (LOZ-BUG-003)", () => {
  it("treats ok/healthy with zero errors as healthy", () => {
    expect(isSinkHealthy({ status: "ok", errors: 0 })).toBe(true);
    expect(isSinkHealthy({ status: "OK", errors: 0 })).toBe(true);
    expect(isSinkHealthy({ status: "healthy", errors: 0 })).toBe(true);
  });

  it("treats any error count or degraded status as unhealthy", () => {
    expect(isSinkHealthy({ status: "ok", errors: 2 })).toBe(false);
    expect(isSinkHealthy({ status: "degraded", errors: 0 })).toBe(false);
    expect(isSinkHealthy({})).toBe(false);
  });

  it("renders zero as a value and only missing data as a dash", () => {
    expect(formatHealthMetric(0)).toBe("0");
    expect(formatHealthMetric(1234)).toBe("1,234");
    expect(formatHealthMetric(null)).toBe("\u2014");
    expect(formatHealthMetric(undefined)).toBe("\u2014");
  });
});

describe("Stale async guard (LOZ-BUG-003)", () => {
  it("accepts only the latest request id", () => {
    expect(isLatestRequest(2, 2)).toBe(true);
    expect(isLatestRequest(1, 2)).toBe(false);
  });
});

describe("Settings connection test uses draft values (LOZ-BUG-003)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppStore.setState({
      collectorUrl: "http://saved-collector:9308",
      cortexUrl: "http://saved-cortex:9312",
    });
  });

  it("tests the draft collector URL rather than the saved one", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    await testCollectorConnection("http://draft-collector:9308/");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("http://draft-collector:9308/health");
  });

  it("tests the draft cortex URL rather than the saved one", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    await testCortexConnection("  http://draft-cortex:9312  ");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("http://draft-cortex:9312/healthz");
  });

  it("falls back to the saved URL when no draft is provided", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    await testCollectorConnection();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("http://saved-collector:9308/health");
  });
});
