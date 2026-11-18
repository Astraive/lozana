import { describe, expect, it } from "vitest";
import { computeGaugeAngle, computeGaugePercentage } from "@/lib/gauge";

describe("gauge percentage", () => {
  it("maps a value onto the configured range", () => {
    expect(computeGaugePercentage(50, 0, 100)).toBe(50);
    expect(computeGaugePercentage(25, 0, 100)).toBe(25);
    expect(computeGaugePercentage(75, 50, 100)).toBe(50);
  });

  it("clamps values outside the range", () => {
    expect(computeGaugePercentage(-10, 0, 100)).toBe(0);
    expect(computeGaugePercentage(150, 0, 100)).toBe(100);
  });

  it("returns a defined percentage when gaugeMin equals gaugeMax", () => {
    // Regression: the old inline formula computed (0 / 0) * 100 = NaN here.
    const percentage = computeGaugePercentage(50, 50, 50);
    expect(Number.isFinite(percentage)).toBe(true);
    expect(percentage).toBe(0);
    expect(Number.isFinite(computeGaugeAngle(percentage))).toBe(true);
    expect(computeGaugeAngle(percentage)).toBe(-90);
  });

  it("returns a defined percentage for an inverted range", () => {
    const percentage = computeGaugePercentage(50, 100, 0);
    expect(Number.isFinite(percentage)).toBe(true);
    expect(computeGaugeAngle(percentage)).toBe(-90);
  });
});

describe("gauge angle", () => {
  it("maps 0-100 percent to a -90 to +90 degree half circle", () => {
    expect(computeGaugeAngle(0)).toBe(-90);
    expect(computeGaugeAngle(50)).toBe(0);
    expect(computeGaugeAngle(100)).toBe(90);
  });
});
