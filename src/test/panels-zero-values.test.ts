import { describe, expect, it } from "vitest";
import {
  computeGaugePercentage,
  finiteOr,
  firstFiniteValue,
  getHeatmapValueRange,
  isFiniteHeatmapPoint,
  resolveDisplayRows,
  toVariableOption,
} from "@/lib/panel-math";

describe("zero values render as zero", () => {
  it("finiteOr keeps zero and falls back only for missing/invalid values", () => {
    expect(finiteOr(0, 1)).toBe(0);
    expect(finiteOr("0", 1)).toBe(0);
    expect(finiteOr(undefined, 1)).toBe(1);
    expect(finiteOr(null, 1)).toBe(1);
    expect(finiteOr("nope", 1)).toBe(1);
  });

  it("firstFiniteValue returns a legitimate zero field before later fields", () => {
    expect(firstFiniteValue({ count: 0, other: 5 }, ["count", "other"])).toBe(0);
    expect(firstFiniteValue({ count: undefined, other: 5 }, ["count", "other"])).toBe(5);
    expect(firstFiniteValue({ count: "x", other: 5 }, ["count", "other"])).toBe(5);
    expect(firstFiniteValue({ count: "x" }, ["count"])).toBeUndefined();
  });

  it("toVariableOption preserves a zero option", () => {
    expect(toVariableOption(0)).toBe("0");
    expect(toVariableOption("0")).toBe("0");
    expect(toVariableOption("")).toBe("");
    expect(toVariableOption(undefined)).toBe("");
  });
});

describe("degenerate gauge data", () => {
  it("never produces NaN when max equals min", () => {
    expect(computeGaugePercentage(50, 50, 50)).toBe(0);
    expect(Number.isNaN(computeGaugePercentage(50, 50, 50))).toBe(false);
  });

  it("keeps zero at the low end and clamps out-of-range values", () => {
    expect(computeGaugePercentage(0, 0, 100)).toBe(0);
    expect(computeGaugePercentage(50, 0, 100)).toBe(50);
    expect(computeGaugePercentage(150, 0, 100)).toBe(100);
    expect(computeGaugePercentage(-10, 0, 100)).toBe(0);
  });

  it("handles invalid ranges and invalid values safely", () => {
    expect(computeGaugePercentage(5, 10, 0)).toBe(0);
    expect(computeGaugePercentage(Number.NaN, 0, 100)).toBe(0);
  });
});

describe("degenerate heatmap data", () => {
  it("returns a finite neutral range for empty data", () => {
    expect(getHeatmapValueRange([])).toEqual({ min: 0, max: 0 });
  });

  it("ignores malformed points and keeps zero-valued cells", () => {
    const points = [
      { x: "a", y: "b", value: 0 },
      { x: "a", y: "b", value: Number.NaN },
      { x: "c", y: "d", value: 3 },
    ];
    expect(points.filter(isFiniteHeatmapPoint)).toHaveLength(2);
    expect(getHeatmapValueRange(points)).toEqual({ min: 0, max: 3 });
  });
});

describe("log stream pause", () => {
  const live = [{ message: "new" }];
  const frozen = [{ message: "old" }];

  it("shows the frozen snapshot while paused", () => {
    expect(resolveDisplayRows(live, true, frozen)).toBe(frozen);
  });

  it("resumes to live rows when unpaused", () => {
    expect(resolveDisplayRows(live, false, frozen)).toBe(live);
    expect(resolveDisplayRows(live, false, null)).toBe(live);
  });
});
