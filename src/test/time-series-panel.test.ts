import { describe, expect, it } from "vitest";
import { buildTimeSeriesData, resolveMetricValue } from "@/lib/timeseries-data";

describe("time-series metric resolution", () => {
  it("preserves a legitimate zero count instead of falling through to another metric", () => {
    // An empty bin has event_count: 0; with `||` the later latency value won.
    expect(resolveMetricValue({ event_count: 0, p95_duration_ms: 42 })).toBe(0);
    expect(buildTimeSeriesData([{ bin: "10:00", event_count: 0, p95_duration_ms: 42 }])).toEqual([
      { timestamp: "10:00", value: 0, service: "series" },
    ]);
  });

  it("does not depend on object key insertion order or fabricate values", () => {
    expect(resolveMetricValue({ p95_duration_ms: 12, event_count: 3 })).toBe(3);
    expect(resolveMetricValue({ event_count: 3, p95_duration_ms: 12 })).toBe(3);
    // The removed `Object.values(r)[1]` could read an arbitrary non-numeric column.
    expect(resolveMetricValue({ diagnostic: "n/a", event_count: 5 })).toBe(5);
    expect(resolveMetricValue({})).toBe(0);
  });

  it("selects one explicit metric when a query returns several", () => {
    const row = { bin: "10:00", event_count: 100, p95_duration_ms: 250, service: "api" };
    expect(resolveMetricValue(row, "p95_duration_ms")).toBe(250);
    expect(buildTimeSeriesData([row], "p95_duration_ms")).toEqual([
      { timestamp: "10:00", value: 250, service: "api" },
    ]);
    expect(resolveMetricValue({ event_count: 0 }, "event_count")).toBe(0);
  });

  it("treats null as absent but keeps zero, and never emits NaN", () => {
    expect(resolveMetricValue({ event_count: null, count: 4 })).toBe(4);
    expect(resolveMetricValue({ count_: 0, count: 9 })).toBe(0);
    expect(resolveMetricValue({ event_count: "not-a-number" })).toBe(0);
    expect(resolveMetricValue({ event_count: "7" })).toBe(7);
  });
});
