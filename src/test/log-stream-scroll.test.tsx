// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { Panel } from "@/types/dashboard";

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
vi.mock("@/lib/hooks", () => ({
  useQueryEvents: () => ({ data: { rows: state.rows }, isLoading: false, isFetching: false, error: null }),
}));
vi.mock("@/stores/dashboard.store", () => ({
  useDashboardStore: (selector: (value: unknown) => unknown) => selector({ interpolateQuery: (query: string) => query, isEditingLayout: false }),
}));
import { LogStreamPanel } from "@/components/panels/LogStreamPanel";

const panel: Panel = {
  id: "panel", title: "Live tail", type: "logstream", query: "from events",
  position: { x: 0, y: 0, w: 6, h: 4 },
};

beforeEach(() => { cleanup(); state.rows = []; });

describe("live tail scroll following", () => {
  it("scrolls to appended rows while following the live stream", () => {
    state.rows = [{ message: "first" }];
    const view = render(<LogStreamPanel panel={panel} />);
    const scroll = view.container.querySelector<HTMLElement>(".overflow-y-auto");
    expect(scroll).not.toBeNull();
    Object.defineProperty(scroll, "scrollHeight", { configurable: true, value: 500 });
    state.rows = [{ message: "first" }, { message: "second" }];
    view.rerender(<LogStreamPanel panel={panel} />);
    expect(scroll?.scrollTop).toBe(500);
  });

  it("stops following after the user scrolls away", () => {
    state.rows = [{ message: "first" }];
    const view = render(<LogStreamPanel panel={panel} />);
    const scroll = view.container.querySelector<HTMLElement>(".overflow-y-auto");
    expect(scroll).not.toBeNull();
    Object.defineProperty(scroll, "scrollHeight", { configurable: true, value: 500 });
    Object.defineProperty(scroll, "clientHeight", { configurable: true, value: 100 });
    if (!scroll) return;
    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event("scroll", { bubbles: true }));
    state.rows = [{ message: "first" }, { message: "second" }];
    view.rerender(<LogStreamPanel panel={panel} />);
    expect(scroll.scrollTop).toBe(0);
  });
});
