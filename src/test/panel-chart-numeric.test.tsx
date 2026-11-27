// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { Panel } from "@/types/dashboard";

interface ChartProps { data: { name: string; value: number }[] }
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], chart: null as ChartProps | null }));
vi.mock("@/lib/hooks", () => ({
  useQueryEvents: () => ({ data: { rows: state.rows }, isLoading: false, isFetching: false, error: null }),
}));
vi.mock("@/stores/dashboard.store", () => ({
  useDashboardStore: (selector: (value: unknown) => unknown) => selector({ interpolateQuery: (query: string) => query, isEditingLayout: false }),
}));
vi.mock("@/components/charts/BarChart", () => ({ BarChart: (props: ChartProps) => { state.chart = props; return <div />; } }));
vi.mock("@/components/charts/PieChart", () => ({ PieChart: (props: ChartProps) => { state.chart = props; return <div />; } }));
import { BarPanel } from "@/components/panels/BarPanel";
import { PiePanel } from "@/components/panels/PiePanel";

const panel = (type: "bar" | "pie"): Panel => ({
  id: "panel", title: "Chart", type, query: "from events", position: { x: 0, y: 0, w: 6, h: 4 },
});

beforeEach(() => { state.rows = []; state.chart = null; cleanup(); });

describe("bar and pie numeric measures", () => {
  it("filters nonnumeric measures instead of passing NaN to the chart", () => {
    state.rows = [{ service: "api", count: "missing" }];
    render(<BarPanel panel={panel("bar")} />);
    expect(state.chart).toBeNull();
  });

  it("does not reinterpret a category-only pie row as a numeric measure", () => {
    state.rows = [{ service: "api" }];
    render(<PiePanel panel={panel("pie")} />);
    expect(state.chart).toBeNull();
  });

  it("retains valid finite values and excludes invalid rows", () => {
    state.rows = [{ service: "api", count: 0 }, { service: "web", count: "missing" }];
    render(<BarPanel panel={panel("bar")} />);
    expect(state.chart?.data).toEqual([{ name: "api", value: 0 }]);
  });
  it("keeps a valid bar row beyond the display limit after filtering invalid rows", () => {
    state.rows = [...Array.from({ length: 15 }, (_, index) => ({ service: `invalid-${index}`, count: "missing" })), { service: "valid", count: 7 }];
    render(<BarPanel panel={panel("bar")} />);
    expect(state.chart?.data).toEqual([{ name: "valid", value: 7 }]);
  });

  it("keeps a valid pie row beyond the display limit after filtering invalid rows", () => {
    state.rows = [...Array.from({ length: 8 }, (_, index) => ({ service: `invalid-${index}`, count: "missing" })), { service: "valid", count: 9 }];
    render(<PiePanel panel={panel("pie")} />);
    expect(state.chart?.data).toEqual([{ name: "valid", value: 9 }]);
  });

  it("uses a single numeric pie field as its measure", () => {
    state.rows = [{ total: 12 }];
    render(<PiePanel panel={panel("pie")} />);
    expect(state.chart?.data).toEqual([{ name: "total", value: 12 }]);
  });
});
