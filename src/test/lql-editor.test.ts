import { describe, it, expect } from "vitest";
import {
  LQL_KEYWORDS,
  LQL_AGGREGATES,
  LQL_FUNCTIONS,
  LQL_OPERATORS,
  LQL_CANONICAL_FIELDS,
} from "@/lib/lql/monaco-lql";

describe("Monaco LQL Grammar & Tokens", () => {
  it("defines all essential LQL pipeline keywords", () => {
    expect(LQL_KEYWORDS).toContain("from");
    expect(LQL_KEYWORDS).toContain("where");
    expect(LQL_KEYWORDS).toContain("summarize");
    expect(LQL_KEYWORDS).toContain("by");
    expect(LQL_KEYWORDS).toContain("sort");
    expect(LQL_KEYWORDS).toContain("take");
    expect(LQL_KEYWORDS).toContain("distinct");
    expect(LQL_KEYWORDS).toContain("project");
    expect(LQL_KEYWORDS).toContain("extend");
  });

  it("defines standard LQL aggregate functions", () => {
    expect(LQL_AGGREGATES).toContain("count");
    expect(LQL_AGGREGATES).toContain("p50");
    expect(LQL_AGGREGATES).not.toContain("p90");
    expect(LQL_AGGREGATES).toContain("p95");
    expect(LQL_AGGREGATES).toContain("p99");
    expect(LQL_AGGREGATES).toContain("avg");
    expect(LQL_AGGREGATES).toContain("sum");
    expect(LQL_AGGREGATES).toContain("dcount");
  });

  it("defines built-in time and transformation functions", () => {
    expect(LQL_FUNCTIONS).toContain("bin");
    expect(LQL_FUNCTIONS).toContain("ago");
    expect(LQL_FUNCTIONS).toContain("now");
    expect(LQL_FUNCTIONS).toContain("coalesce");
    expect(LQL_FUNCTIONS).not.toContain("contains");
  });

  it("defines infix comparison operators separately from functions", () => {
    expect(LQL_OPERATORS).toContain("contains");
    expect(LQL_OPERATORS).toContain("matches");
  });

  it("defines canonical Loza wide-event fields", () => {
    expect(LQL_CANONICAL_FIELDS).toContain("event_id");
    expect(LQL_CANONICAL_FIELDS).toContain("timestamp");
    expect(LQL_CANONICAL_FIELDS).toContain("service");
    expect(LQL_CANONICAL_FIELDS).toContain("level");
    expect(LQL_CANONICAL_FIELDS).toContain("duration_ms");
    expect(LQL_CANONICAL_FIELDS).toContain("trace_id");
    expect(LQL_CANONICAL_FIELDS).toContain("status_code");
    expect(LQL_CANONICAL_FIELDS).toContain("attrs");
    expect(LQL_CANONICAL_FIELDS).toContain("checkpoints");
  });
});
