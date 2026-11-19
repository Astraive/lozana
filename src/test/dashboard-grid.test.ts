import { describe, it, expect, afterEach } from "vitest";
import { resolveCreatedPanel } from "@/components/dashboard/new-panel";
import { useDashboardStore } from "@/stores/dashboard.store";

const NEW_PANEL = {
  title: "New Time Series",
  type: "timeseries" as const,
  query: "from events | summarize event_count = count() by bin(timestamp, 5m) | sort bin asc",
  position: { x: 0, y: 100, w: 6, h: 4 },
  visualization: { chartType: "area" as const, color: "#3b82f6" },
};

const createdIds: string[] = [];

describe("DashboardGrid: newly added panel lookup", () => {
  afterEach(() => {
    useDashboardStore.setState((s) => ({
      dashboards: s.dashboards.map((d) => ({
        ...d,
        panels: d.panels.filter((p) => !createdIds.includes(p.id)),
      })),
    }));
    createdIds.length = 0;
  });

  it("resolves the newly added panel from live store state even though the render prop is stale", () => {
    const store = useDashboardStore.getState();

    // This snapshot is the `dashboard` prop captured at render time. The store
    // update is synchronous, but this object never changes during the handler.
    const staleDashboardProp = store.getActiveDashboard()!;

    const newId = store.addPanelToActiveDashboard(NEW_PANEL);
    expect(newId).not.toBe("");
    createdIds.push(newId);

    // The stale prop misses: this is exactly why the old lookup always fell
    // back to a duplicated panel definition.
    expect(staleDashboardProp.panels.find((p) => p.id === newId)).toBeUndefined();

    // Reading from live store state returns the real created panel.
    const freshDashboard = useDashboardStore.getState().getActiveDashboard()!;
    const resolved = resolveCreatedPanel(newId, freshDashboard);
    expect(resolved.id).toBe(newId);
    expect(resolved.title).toBe("New Time Series");
    expect(resolved).toBe(freshDashboard.panels.find((p) => p.id === newId));
  });
});
