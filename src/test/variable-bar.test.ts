import { describe, expect, it } from "vitest";
import {
  describeQueryError,
  extractQueryOptions,
  getVariableFallbackOptions,
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
