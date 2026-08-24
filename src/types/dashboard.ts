export type PanelType =
  | "timeseries"
  | "stat"
  | "bar"
  | "pie"
  | "heatmap"
  | "gauge"
  | "table"
  | "logstream"
  | "tracelist"
  | "markdown";

export interface Dashboard {
  id: string;
  title: string;
  name?: string; // alias
  description?: string;
  tags?: string[];
  timeRange?: string;
  variables: DashboardVariable[];
  panels: Panel[];
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;
}

export interface PanelPosition {
  x: number;
  y: number;
  w: number; // width in grid units (1-12)
  h: number; // height in grid units (1-12)
}

export interface Panel {
  id: string;
  title: string;
  description?: string;
  type: PanelType;
  query: string;
  content?: string; // For markdown panel
  position: PanelPosition;
  visualization?: PanelVisualization;
}

export interface PanelVisualization {
  xField?: string;
  yField?: string;
  groupBy?: string;
  unit?: "none" | "ms" | "s" | "bytes" | "kb" | "mb" | "percent" | "req/s" | "count";
  color?: string;
  chartType?: "line" | "area" | "stacked-bar" | "grouped-bar";
  thresholds?: Threshold[];
  sparkline?: boolean;
  gaugeMin?: number;
  gaugeMax?: number;
  decimalPlaces?: number;
  showLegend?: boolean;
}

export interface Threshold {
  value: number;
  color: string; // e.g. "green" | "yellow" | "red" | "#10b981"
  label?: string;
}

export interface DashboardVariable {
  id: string;
  name: string;
  label?: string;
  type: "query" | "custom" | "textbox";
  query?: string;
  options?: string[];
  defaultValue?: string;
  currentValue?: string;
  includeAll?: boolean;
}
