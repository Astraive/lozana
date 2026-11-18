import type { Panel } from "@/types/dashboard";

/**
 * Whether a panel's event query should run.
 *
 * Combines the caller's `enabled` state (e.g. a log stream's pause toggle) with
 * the panel's own validity, so pausing a stream actually stops its query.
 */
export function isPanelQueryEnabled(panel: Panel, enabled: boolean): boolean {
  return enabled && Boolean(panel.query && panel.type !== "markdown");
}
