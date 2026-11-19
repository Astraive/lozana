import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart } from "@/components/charts/BarChart";
import { LozaBarChart } from "@/components/charts/loza-bar-chart";
import lozaSource from "@/components/charts/loza-bar-chart.tsx?raw";
import sharedSource from "@/components/charts/BarChart.tsx?raw";

const recorded = vi.hoisted(() => ({ bars: [] as Array<{ radius?: unknown }> }));

vi.mock("recharts", () => {
  const passthrough = ({ children }: { children?: ReactNode }) => children as never;
  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    Bar: (props: { radius?: unknown }) => {
      recorded.bars.push(props);
      return null;
    },
    XAxis: passthrough,
    YAxis: passthrough,
    Tooltip: passthrough,
    CartesianGrid: passthrough,
  };
});

const baseProps = {
  data: [{ label: "a", value: 1 }],
  xField: "label",
  yField: "value",
};

beforeEach(() => {
  recorded.bars.length = 0;
});

describe("single parameterized bar chart implementation", () => {
  it("forwards a custom radius from BarChart to the underlying Bar", () => {
    renderToStaticMarkup(<BarChart {...baseProps} radius={[8, 8, 0, 0]} />);

    expect(recorded.bars).toHaveLength(1);
    expect(recorded.bars[0].radius).toEqual([8, 8, 0, 0]);
  });

  it("preserves the original default radii of both public components", () => {
    renderToStaticMarkup(<BarChart {...baseProps} />);
    renderToStaticMarkup(<LozaBarChart {...baseProps} />);

    expect(recorded.bars.map((bar) => bar.radius)).toEqual([
      [3, 3, 0, 0],
      [4, 4, 0, 0],
    ]);
  });

  it("keeps LozaBarChart as a wrapper instead of a byte-for-byte copy", () => {
    expect(lozaSource).toContain('from "@/components/charts/BarChart"');
    expect(lozaSource).not.toContain('from "recharts"');
    expect(lozaSource).not.toContain("ResponsiveContainer");
    expect(sharedSource.match(/<Bar\b/g)).toHaveLength(1);
  });
});
