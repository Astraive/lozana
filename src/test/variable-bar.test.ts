import { describe, expect, it, vi } from "vitest";
import {
  describeQueryError,
  extractQueryOptions,
  getVariableFallbackOptions,
  loadVariableOptions,
} from "@/lib/dashboard-variable-options";
import type { DashboardVariable } from "@/types/dashboard";

const FABRICATED_SERVICES = ["auth-service", "payment-api", "frontend", "checkout-worker"];

const statusVariable: DashboardVariable = {
  id: "v-status",
  name: "status_code",
  label: "Status code",
  type: "query",
  query: "from events | distinct status_code",
};

describe("VariableBar query option handling", () => {
  it("extracts the first value of each query result row", () => {
    expect(
      extractQueryOptions([
        { status_code: "200" },
        { status_code: "404" },
        { status_code: "" },
      ])
    ).toEqual(["200", "404"]);
  });

  it("does not fabricate unrelated service names when a query fails", () => {
    // A status-code/region variable must never show service-name choices just
    // because its query rejected. The fallback is empty for unconfigured vars.
    const fallback = getVariableFallbackOptions(statusVariable);
    expect(fallback).toEqual([]);
    expect(fallback).not.toEqual(FABRICATED_SERVICES);
    for (const fabricated of FABRICATED_SERVICES) {
      expect(fallback).not.toContain(fabricated);
    }
  });

  it("uses the per-variable configured options as the fallback when present", () => {
    const regionVariable: DashboardVariable = {
      ...statusVariable,
      name: "region",
      options: ["us-east-1", "eu-west-1"],
    };
    const fallback = getVariableFallbackOptions(regionVariable);
    expect(fallback).toEqual(["us-east-1", "eu-west-1"]);
    expect(fallback).not.toBe(regionVariable.options);
  });

  it("keeps the real query error message so it can be surfaced", () => {
    expect(describeQueryError(new Error("collector offline"))).toBe("collector offline");
    expect(describeQueryError("timeout")).toBe("timeout");
    expect(describeQueryError({})).toBe("Unknown error");
  });
});

type RowsResult = { rows: Record<string, unknown>[] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

/** The original effect body: no generation guard, so stale resolutions leak. */
function legacyLoadVariableOptions(
  variables: DashboardVariable[],
  queryLql: (query: string) => Promise<RowsResult>,
  apply: (name: string, options: string[], error: string | undefined) => void
): () => void {
  for (const v of variables) {
    if (v.type === "query" && v.query) {
      queryLql(v.query)
        .then((res) => apply(v.name, extractQueryOptions(res.rows), undefined))
        .catch((error: unknown) =>
          apply(v.name, getVariableFallbackOptions(v), describeQueryError(error))
        );
    }
  }
  return () => {};
}

describe("VariableBar async option loads", () => {
  it("regression contrast: the unguarded effect applied a response after cleanup", async () => {
    const pending = deferred<RowsResult>();
    const apply = vi.fn();
    const cleanup = legacyLoadVariableOptions([statusVariable], () => pending.promise, apply);

    cleanup();
    pending.resolve({ rows: [{ status_code: "500" }] });
    await flush();

    expect(apply).toHaveBeenCalledWith("status_code", ["500"], undefined);
  });

  it("ignores a successful resolution that arrives after cleanup", async () => {
    const pending = deferred<RowsResult>();
    const apply = vi.fn();
    const cleanup = loadVariableOptions([statusVariable], () => pending.promise, apply);

    cleanup();
    pending.resolve({ rows: [{ status_code: "500" }] });
    await flush();

    expect(apply).not.toHaveBeenCalled();
  });

  it("ignores a failed resolution that arrives after cleanup", async () => {
    const pending = deferred<RowsResult>();
    const apply = vi.fn();
    const cleanup = loadVariableOptions([statusVariable], () => pending.promise, apply);

    cleanup();
    pending.reject(new Error("superseded request"));
    await flush();

    expect(apply).not.toHaveBeenCalled();
  });

  it("still applies a fresh resolution and clears its error while active", async () => {
    const pending = deferred<RowsResult>();
    const apply = vi.fn();
    loadVariableOptions([statusVariable], () => pending.promise, apply);

    pending.resolve({ rows: [{ status_code: "200" }, { status_code: "" }] });
    await flush();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("status_code", ["200"], undefined);
  });

  it("still surfaces the error and per-variable fallback while active", async () => {
    const pending = deferred<RowsResult>();
    const apply = vi.fn();
    const variable: DashboardVariable = {
      ...statusVariable,
      options: ["200", "404"],
    };
    loadVariableOptions([variable], () => pending.promise, apply);

    pending.reject(new Error("collector offline"));
    await flush();

    expect(apply).toHaveBeenCalledWith("status_code", ["200", "404"], "collector offline");
  });

  it("does not start a query for non-query variables", () => {
    const queryLql = vi.fn(() => Promise.resolve({ rows: [] }));
    const apply = vi.fn();
    const variable: DashboardVariable = {
      id: "v-region",
      name: "region",
      type: "custom",
      options: ["us-east-1"],
    };

    loadVariableOptions([variable], queryLql, apply);

    expect(queryLql).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });
});
