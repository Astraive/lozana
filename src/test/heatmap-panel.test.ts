import { describe, expect, it } from "vitest";
import { buildHeatmapData } from "@/lib/panel-math";

describe("heatmap data contract", () => {
  it("uses only backend-provided axes and values", () => {
    const heatmap = buildHeatmapData([
      { time_bucket: "10:00", latency_bucket: "0-50ms", count: 7 },
      { time_bucket: "10:05", latency_bucket: "0-50ms", count: 3 },
      { time_bucket: "10:00", latency_bucket: "50-100ms", count: 2 },
    ]);

    expect(heatmap?.xLabels).toEqual(["10:00", "10:05"]);
    expect(heatmap?.yLabels).toEqual(["0-50ms", "50-100ms"]);
    expect(heatmap?.values.get("0-50ms\u000010:00")).toBe(7);
    expect(heatmap?.maxValue).toBe(7);
  });

  it("rejects rows that would require synthetic axes, values, or aggregation", () => {
    expect(buildHeatmapData([{ timestamp: "10:00", count: 4 }])).toBeNull();
    expect(buildHeatmapData([{ x: "10:00", y: "slow", value: -1 }])).toBeNull();
    expect(buildHeatmapData([
      { x: "10:00", y: "slow", value: 1 },
      { x: "10:00", y: "slow", value: 2 },
    ])).toBeNull();
  });

  it("skips malformed rows instead of blanking the whole chart", () => {
    const heatmap = buildHeatmapData([
      { x: "10:00", y: "fast", value: 4 },
      { x: "10:05" },
      { x: "10:05", y: "fast", value: "nope" },
      { x: "10:05", y: "fast", value: 6 },
    ]);

    expect(heatmap?.xLabels).toEqual(["10:00", "10:05"]);
    expect(heatmap?.yLabels).toEqual(["fast"]);
    expect(heatmap?.values.get("fast\u000010:00")).toBe(4);
    expect(heatmap?.values.get("fast\u000010:05")).toBe(6);
    expect(heatmap?.maxValue).toBe(6);
  });

  it("keeps legitimate zero-valued cells", () => {
    const heatmap = buildHeatmapData([{ x: "10:00", y: "fast", value: 0 }]);
    expect(heatmap?.values.get("fast\u000010:00")).toBe(0);
    expect(heatmap?.maxValue).toBe(0);
  });
});
