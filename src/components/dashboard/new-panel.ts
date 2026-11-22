import type { Dashboard, Panel } from "@/types/dashboard";

/** Single source of truth for the panel created by "Add First Panel". */
export const DEFAULT_NEW_PANEL: Omit<Panel, "id"> = {
  title: "New Time Series",
  type: "timeseries",
  query: "from events | summarize event_count = count() by bin(timestamp, 5m) | sort bin asc",
  position: { x: 0, y: 100, w: 6, h: 4 },
  visualization: { chartType: "line", color: "#3b82f6" },
};

/**
 * Resolve the panel that `addPanelToActiveDashboard` just created.
 *
 * The `dashboard` prop is captured at render time and is stale inside the
 * click handler: the store `set` only reaches the component after React
 * re-renders, which happens after the handler returns. Looking the panel up
 * on that prop therefore always misses and a duplicate is used instead.
 * Callers must pass the *live* store state so the real created panel (with
 * its generated id) is returned.
 */
export function resolveCreatedPanel(
  newId: string,
  freshDashboard: Dashboard | undefined,
  fallback: Omit<Panel, "id"> = DEFAULT_NEW_PANEL
): Panel {
  return freshDashboard?.panels.find((p) => p.id === newId) ?? {
    id: newId,
    ...fallback,
  };
}
