// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/hooks", () => ({
  useQueryEvents: () => ({
    data: { columns: ["timestamp", "event_count"], rows: [{ timestamp: "2026-01-01T00:00:00Z", event_count: 3 }] },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => (
    <textarea aria-label="Local query editor" value={value} onChange={(event) => onChange?.(event.target.value)} />
  ),
}));
vi.mock("recharts", () => {
  const children = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const empty = () => null;
  return {
    ResponsiveContainer: children,
    LineChart: children,
    AreaChart: children,
    BarChart: children,
    PieChart: children,
    Line: empty,
    Area: empty,
    Bar: empty,
    Pie: children,
    Cell: empty,
    XAxis: empty,
    YAxis: empty,
    CartesianGrid: empty,
    Tooltip: empty,
    Legend: empty,
    ReferenceLine: empty,
  };
});

import DashboardsPage from "@/pages/dashboards";
import { useDashboardStore } from "@/stores/dashboard.store";

const initialState = useDashboardStore.getState();

afterEach(() => {
  cleanup();
  useDashboardStore.setState(initialState, true);
  vi.restoreAllMocks();
});

beforeEach(() => {
  const dashboard = useDashboardStore.getState().getActiveDashboard()!;
  useDashboardStore.setState({
    dashboards: [{ ...dashboard, id: "page-add-test", title: "Page add test", panels: [] }],
    activeDashboardId: "page-add-test",
    variableValues: {},
    isEditingLayout: false,
  });
});

it("saves edits from the page Add Panel editor to the active dashboard store", () => {
  render(<DashboardsPage />);
  fireEvent.click(screen.getByRole("button", { name: "Add Panel" }));
  expect(useDashboardStore.getState().getActiveDashboard()?.panels).toHaveLength(1);

  fireEvent.change(screen.getByPlaceholderText("e.g. Ingest Rate by Service"), { target: { value: "Edited latency" } });
  fireEvent.change(screen.getByLabelText("Local query editor"), { target: { value: "from events | limit 7" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));

  const stored = useDashboardStore.getState().getActiveDashboard()!.panels[0]!;
  expect({ title: stored.title, query: stored.query, dialogClosed: screen.queryByRole("dialog") === null }).toEqual({
    title: "Edited latency",
    query: "from events | limit 7",
    dialogClosed: true,
  });
});
