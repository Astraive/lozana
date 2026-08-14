export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  panels: Panel[];
  variables: DashboardVariable[];
  created_at: string;
  updated_at: string;
}

export interface Panel {
  id: string;
  title: string;
  type: "stat" | "line" | "area" | "bar" | "pie" | "table" | "event-list" | "trace-list" | "heatmap" | "query";
  query: string;
  visualization?: PanelVisualization;
  position: { x: number; y: number; w: number; h: number };
}

export interface PanelVisualization {
  xField?: string;
  yField?: string;
  groupBy?: string;
  unit?: string;
  thresholds?: Threshold[];
  color?: string;
}

export interface Threshold {
  value: number;
  color: string;
  label?: string;
}

export interface DashboardVariable {
  name: string;
  type: "query" | "custom" | "textbox";
  query?: string;
  options?: string[];
  default?: string;
}
