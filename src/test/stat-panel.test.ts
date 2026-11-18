import { describe, expect, it } from "vitest";
import { resolveStatTargetKey, sparklineValue } from "@/lib/stat-panel-values";

describe("stat panel sparkline values", () => {
  it("preserves a legitimate zero instead of coercing it to one", () => {
    expect(sparklineValue({ count: 0 }, "count")).toBe(0);
    expect(sparklineValue({ count: "0" }, "count")).toBe(0);
  });

  it("reads the targetKey column, not the first column, so bars match the headline", () => {
    const row = { time_bucket: "10:00", count: 42 };
    const targetKey = resolveStatTargetKey(row);
    expect(targetKey).toBe("count");
    // Object.values(row)[0] is "10:00" (NaN -> fallback 1); the bar must use `count`.
    expect(sparklineValue(row, targetKey)).toBe(42);
  });

  it("falls back to 1 only for missing or invalid values", () => {
    expect(sparklineValue({ count: null }, "count")).toBe(1);
    expect(sparklineValue({}, "count")).toBe(1);
    expect(sparklineValue({ count: "n/a" }, "count")).toBe(1);
  });

  it("reuses the same key-detection rule as the headline value", () => {
    expect(resolveStatTargetKey({ timestamp: "10:00", p95_duration_ms: 12 })).toBe("p95_duration_ms");
    expect(resolveStatTargetKey({ label: "ok", value: 7 })).toBe("value");
    expect(resolveStatTargetKey({ label: "ok", events: 7 })).toBe("label");
  });
});
