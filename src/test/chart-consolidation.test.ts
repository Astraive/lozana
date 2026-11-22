import type { ReactElement, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart as RechartsAreaChart,
  Line,
  LineChart as RechartsLineChart,
} from "recharts";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { LozaLineChart } from "@/components/charts/loza-line-chart";

type Element = ReactElement<Record<string, unknown>>;

/** Collect every React element in a rendered tree that matches `type`. */
function findByType(tree: ReactNode, type: unknown): Element[] {
  const found: Element[] = [];
  const visit = (node: ReactNode): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const element = node as Element;
    if (element.type === type) found.push(element);
    const props = element.props as Record<string, unknown> | undefined;
    if (props && "children" in props) visit(props.children as ReactNode);
  };
  visit(tree);
  return found;
}

const baseProps = {
  data: [{ timestamp: "t1", value: 1 }],
  xField: "timestamp",
  yField: "value",
};
describe("TimeSeriesChart visualization", () => {
  it("renders an area when selected and keeps line as the default", () => {
    const line = TimeSeriesChart(baseProps) as Element;
    expect(findByType(line, RechartsLineChart)).toHaveLength(1);
    expect(findByType(line, Line)).toHaveLength(1);
    expect(findByType(line, RechartsAreaChart)).toHaveLength(0);
    expect(findByType(line, Area)).toHaveLength(0);

    const area = TimeSeriesChart({ ...baseProps, chartType: "area", color: "#10b981" }) as Element;
    expect(findByType(area, RechartsAreaChart)).toHaveLength(1);
    expect(findByType(area, Area)[0].props).toMatchObject({
      dataKey: "value",
      stroke: "#10b981",
      fill: "#10b981",
    });
    expect(findByType(area, RechartsLineChart)).toHaveLength(0);
    expect(findByType(area, Line)).toHaveLength(0);
  });
});


describe("line chart consolidation", () => {
  it("LozaLineChart delegates to the shared TimeSeriesChart implementation", () => {
    const rendered = LozaLineChart(baseProps) as Element;

    // Before the fix LozaLineChart returned its own <div>/<RechartsLineChart>
    // tree. After consolidation it renders the shared component directly.
    expect(rendered.type).toBe(TimeSeriesChart);
    expect(rendered.props).toMatchObject({
      ...baseProps,
      gridVertical: false,
      tooltipCursor: { stroke: "var(--border)" },
    });
  });

  it("TimeSeriesChart is the single implementation with configurable grid/cursor", () => {
    const rendered = TimeSeriesChart(baseProps) as Element;

    const grids = findByType(rendered, CartesianGrid);
    const tooltips = findByType(rendered, Tooltip);
    expect(grids).toHaveLength(1);
    expect(tooltips).toHaveLength(1);

    // Defaults preserve the original TimeSeriesChart rendering.
    expect(grids[0].props.vertical).toBe(true);
    expect(tooltips[0].props.cursor).toBeUndefined();

    // Callers can override the previously hard-coded differences.
    const overridden = TimeSeriesChart({
      ...baseProps,
      gridVertical: false,
      tooltipCursor: { stroke: "var(--border)" },
    }) as Element;
    expect(findByType(overridden, CartesianGrid)[0].props.vertical).toBe(false);
    expect(findByType(overridden, Tooltip)[0].props.cursor).toEqual({
      stroke: "var(--border)",
    });
  });
});
