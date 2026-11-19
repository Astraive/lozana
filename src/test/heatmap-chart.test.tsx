import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeValueRange, HeatmapChart } from "@/components/charts/HeatmapChart";

describe("HeatmapChart composite cell key", () => {
  it("keeps distinct cells separate when labels contain the ':' delimiter", () => {
    // Under the old `${x}:${y}` key these two points both map to "a:b:c",
    // so the second value overwrites the first and the first cell renders
    // with the wrong value/color.
    const data = [
      { x: "a:b", y: "c", value: 5 },
      { x: "a", y: "b:c", value: 9 },
    ];

    const html = renderToStaticMarkup(<HeatmapChart data={data} />);

    expect(html).toContain('title="a:b, c: 5"');
    expect(html).toContain('title="a, b:c: 9"');
  });
});

describe("HeatmapChart value range", () => {
  it("computes the correct min and max from the data", () => {
    expect(computeValueRange([
      { x: "a", y: "b", value: 4 },
      { x: "a", y: "c", value: -2 },
      { x: "b", y: "b", value: 9 },
    ])).toEqual({ min: -2, max: 9 });
  });

  it("returns a finite, degenerate range for empty data", () => {
    expect(computeValueRange([])).toEqual({ min: 0, max: 0 });
  });

  it("renders large datasets without overflowing the call stack", () => {
    const data = Array.from({ length: 200_000 }, (_, i) => ({
      x: "x",
      y: "y",
      value: i,
    }));

    expect(() => renderToStaticMarkup(<HeatmapChart data={data} />)).not.toThrow();
    expect(computeValueRange(data)).toEqual({ min: 0, max: 199_999 });
  });

  it("renders empty data without emitting Infinity colors", () => {
    const html = renderToStaticMarkup(<HeatmapChart data={[]} />);
    expect(html).not.toContain("Infinity");
  });
});
