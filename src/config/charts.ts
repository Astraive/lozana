/**
 * Default chart colors matching the CSS theme.
 * 8 distinct colors for series, thresholds, and categories.
 */
export const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
] as const;

/**
 * Default chart configuration.
 */
export const DEFAULT_CHART_CONFIG = {
  colors: CHART_COLORS,
  margin: { top: 8, right: 8, bottom: 24, left: 40 },
  grid: {
    strokeDasharray: "3 3",
    stroke: "var(--border, #e5e7eb)",
  },
  axis: {
    tick: {
      fontSize: 11,
      fill: "var(--muted-foreground, #6b7280)",
    },
    line: {
      stroke: "var(--border, #e5e7eb)",
    },
  },
  tooltip: {
    cursor: { strokeDasharray: "3 3" },
    contentStyle: {
      backgroundColor: "var(--popover, #fff)",
      border: "1px solid var(--border, #e5e7eb)",
      borderRadius: "6px",
      fontSize: "12px",
    },
  },
  animation: {
    duration: 300,
  },
} as const;
