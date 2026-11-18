import { describe, expect, it } from "vitest";
import { buildServiceExploreQuery, buildVisualLql, lqlStringLiteral, type VisualQueryState } from "@/lib/lql/query-contract";

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

<<<<<<< HEAD
  it("rejects filter operators outside the allowlist to prevent LQL injection", () => {
    const rehydrated = (operator: string): VisualQueryState => ({
      ...baseState,
      filters: [{ id: "1", field: "service", operator: operator as VisualQueryState["filters"][number]["operator"], value: "api" }],
    });

    expect(() => buildVisualLql(rehydrated("= \"x\" | take 999 | from secrets"))).toThrow("invalid LQL filter operator");
    expect(() => buildVisualLql(rehydrated("==="))).toThrow("invalid LQL filter operator");
    expect(() => buildVisualLql(rehydrated("contains | take 1"))).toThrow("invalid LQL filter operator");

    for (const operator of ["=", "!=", "contains", ">", "<", ">=", "<="]) {
      expect(() => buildVisualLql(rehydrated(operator))).not.toThrow();
    }
=======
  it("escapes newlines and control characters so a literal cannot be broken out of", () => {
    const hasRawControl = (text: string) =>
      [...text].some((char) => {
        const code = char.charCodeAt(0);
        return code <= 0x1f || code === 0x7f || char === "\u2028" || char === "\u2029";
      });

    const injected = 'api"\n| where 1 == 1\r\n\x00\u2028';
    const literal = lqlStringLiteral(injected);

    expect(literal).toBe('"api\\"\\n| where 1 == 1\\r\\n\\u0000\\u2028"');
    // No raw line terminator or control character may remain inside the literal.
    expect(hasRawControl(literal)).toBe(false);

    const query = buildVisualLql({
      ...baseState,
      filters: [{ id: "3", field: "service", operator: "=", value: injected }],
    });
    expect(query).toBe(
      'from events | where service = "api\\"\\n| where 1 == 1\\r\\n\\u0000\\u2028" | sort timestamp desc | take 100',
    );
    expect(hasRawControl(query)).toBe(false);
>>>>>>> 9e48adb (fix(lql): escape newlines and control chars in string literals)
  });
});

describe("service explore query", () => {
  it("builds the standard service query for a normal service name", () => {
    expect(buildServiceExploreQuery("api-gateway")).toBe(
      'from events | where service = "api-gateway" | sort timestamp desc | limit 100',
    );
  });

  it("escapes quotes and backslashes in the service name so LQL cannot be injected", () => {
    // A name containing a double quote previously broke out of the LQL literal.
    const malicious = 'api" | take 1 // \\';
    const query = buildServiceExploreQuery(malicious);

    expect(query).toBe(
      'from events | where service = "api\\" | take 1 // \\\\" | sort timestamp desc | limit 100',
    );
    // The literal is balanced: still exactly one service filter and one pipe section per clause.
    expect(query.match(/where service =/g)).toHaveLength(1);
    expect(query).toContain('"api\\" | take 1 // \\\\"');
    // URL-encoding the escaped query round-trips without altering the LQL escaping.
    expect(decodeURIComponent(encodeURIComponent(query))).toBe(query);
  });

  it("escapes an attempted predicate breakout and supports extra filters/limit", () => {
    const query = buildServiceExploreQuery('x" or service = "admin', {
      additionalFilter: 'and (level = "error" or level = "fatal")',
      limit: 50,
    });

    expect(query).toBe(
      'from events | where service = "x\\" or service = \\"admin" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50',
    );
  });

  it("clamps the limit to a safe positive integer", () => {
    expect(buildServiceExploreQuery("svc", { limit: 0 })).toContain("limit 1");
    expect(buildServiceExploreQuery("svc", { limit: 999_999 })).toContain("limit 10000");
    expect(buildServiceExploreQuery("svc", { limit: 5.9 })).toContain("limit 5");
  });
});
