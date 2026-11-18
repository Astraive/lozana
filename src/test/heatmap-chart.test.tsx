import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeatmapChart } from "@/components/charts/HeatmapChart";

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
