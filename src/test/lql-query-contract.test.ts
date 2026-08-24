import { describe, expect, it } from "vitest";
import { buildVisualLql, lqlStringLiteral, type VisualQueryState } from "@/lib/lql/query-contract";

const baseState: VisualQueryState = {
  source: "events",
  timePreset: "all",
  filters: [],
  isAggregate: false,
  aggregates: [],
  groupByField: "",
  timeBucket: "5m",
  useTimeBucket: false,
  sortField: "timestamp",
  sortDir: "desc",
  limit: 100,
};

describe("LQL query contract", () => {
  it("quotes dynamic strings and emits contains as an infix operator", () => {
    const query = buildVisualLql({
      ...baseState,
      filters: [
        { id: "1", field: "message", operator: "contains", value: 'failed "hard" \\ path' },
        { id: "2", field: "service", operator: "=", value: "api" },
      ],
    });

    expect(query).toBe(
      'from events | where message contains "failed \\"hard\\" \\\\ path" | where service = "api" | sort timestamp desc | take 100',
    );
    expect(lqlStringLiteral('a"b\\c')).toBe('"a\\"b\\\\c"');
  });

  it("uses compiler-valid aliases for repeated aggregates and time buckets", () => {
    const query = buildVisualLql({
      ...baseState,
      timePreset: "24h",
      isAggregate: true,
      useTimeBucket: true,
      aggregates: [
        { id: "1", fn: "count", field: "" },
        { id: "2", fn: "p95", field: "duration_ms" },
        { id: "3", fn: "p95", field: "duration_ms" },
      ],
    });

    expect(query).toBe(
      "from events | where timestamp >= ago(24h) | summarize event_count = count(), p95_duration_ms = p95(duration_ms), p95_duration_ms_2 = p95(duration_ms) by bin(timestamp, 5m) | sort bin asc | take 100",
    );
  });

  it("rejects identifiers and durations outside the LQL grammar", () => {
    expect(() => buildVisualLql({ ...baseState, source: "events | take 1" })).toThrow("invalid LQL identifier");
    expect(() => buildVisualLql({ ...baseState, timePreset: "1 hour" })).toThrow("invalid LQL duration");
  });
});
