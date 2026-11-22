// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const fixture = vi.hoisted(() => ({
  errors: [] as Record<string, unknown>[],
  response: { columns: [] as string[], rows: [] as Record<string, unknown>[] },
  requests: [] as { path: string; body: Record<string, unknown> }[],
}));

vi.mock("@/lib/api/client", () => ({
  postJSON: async (path: string, body: Record<string, unknown>) => {
    fixture.requests.push({ path, body });
    return fixture.response;
  },
  fetchJSON: vi.fn(),
}));

vi.mock("@/lib/hooks", () => ({
  useCollectorHealth: () => ({ data: { status: "ok", events_ingested: 12, sinks: [] }, isLoading: false }),
  useTopServices: () => ({ data: { rows: [{ service: "checkout", event_count: 11 }] }, isLoading: false }),
  useTopErrors: () => ({ data: { rows: fixture.errors }, isLoading: false }),
  useEventsOverTime: () => ({ data: { rows: [] }, isLoading: false }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  BarChart: ({ data, children }: { data: unknown; children: React.ReactNode }) => (
    <div><pre data-testid="bar-data">{JSON.stringify(data)}</pre>{children}</div>
  ),
  LineChart: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { getTopErrors } from "@/lib/api/events";
import OverviewPage from "@/pages/overview";

function chartRows() {
  return screen.getAllByTestId("bar-data").map((element) => JSON.parse(element.textContent || "[]"));
}

beforeEach(() => {
  fixture.errors = [];
  fixture.response = { columns: [], rows: [] };
  fixture.requests = [];
});
afterEach(() => cleanup());

describe("Overview top-errors chart adapter", () => {
  it("preserves grouped labels from getTopErrors and retains service and legacy error-code labels", async () => {
    fixture.response = {
      columns: ["error_type", "event_count"],
      rows: [
        { error_type: "TimeoutError", event_count: 7 },
        { error_type: "ValidationError", event_count: 3 },
      ],
    };

    const result = await getTopErrors(8);
    fixture.errors = [...result.rows, { error_code: "E_TIMEOUT", event_count: 5 }];
    render(<OverviewPage />);

    const charts = chartRows();
    expect(fixture.requests).toHaveLength(1);
    expect(fixture.requests[0].path).toBe("/lql/query");
    expect(charts).toContainEqual([
      { name: "TimeoutError", count: 7 },
      { name: "ValidationError", count: 3 },
      { name: "E_TIMEOUT", count: 5 },
    ]);
    expect(charts).toContainEqual([{ name: "checkout", count: 11 }]);
  });

  it("supports canonical flattened and nested error.type response keys", () => {
    fixture.errors = [
      { "error.type": "TimeoutError", event_count: 7 },
      { error: { type: "ValidationError" }, event_count: 3 },
    ];
    render(<OverviewPage />);

    expect(chartRows()).toContainEqual([
      { name: "TimeoutError", count: 7 },
      { name: "ValidationError", count: 3 },
    ]);
  });
});
