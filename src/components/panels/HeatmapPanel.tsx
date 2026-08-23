import { PanelWrapper } from "./PanelWrapper";
import type { Panel } from "@/types/dashboard";

interface HeatmapPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  values: Map<string, number>;
  maxValue: number;
}

const X_FIELDS = ["x", "time", "timestamp", "bin_timestamp", "time_bucket", "bucket_time"];
const Y_FIELDS = ["y", "bucket", "duration_bucket", "latency_bucket", "series"];
const VALUE_FIELDS = ["value", "count", "count_", "event_count"];

function firstPresent(row: Record<string, unknown>, fields: string[]): unknown {
  for (const field of fields) {
    if (row[field] !== undefined && row[field] !== null) return row[field];
  }
  return undefined;
}

export function buildHeatmapData(rows: Record<string, unknown>[]): HeatmapData | null {
  const xLabels: string[] = [];
  const yLabels: string[] = [];
  const values = new Map<string, number>();
  let maxValue = 0;

  for (const row of rows) {
    const rawX = firstPresent(row, X_FIELDS);
    const rawY = firstPresent(row, Y_FIELDS);
    const rawValue = firstPresent(row, VALUE_FIELDS);
    if ((typeof rawX !== "string" && typeof rawX !== "number") ||
        (typeof rawY !== "string" && typeof rawY !== "number") ||
        (typeof rawValue !== "string" && typeof rawValue !== "number")) return null;

    const x = String(rawX);
    const y = String(rawY);
    const value = Number(rawValue);
    if (!x || !y || !Number.isFinite(value) || value < 0) return null;

    const key = `${y}\u0000${x}`;
    if (values.has(key)) return null;
    values.set(key, value);
    if (!xLabels.includes(x)) xLabels.push(x);
    if (!yLabels.includes(y)) yLabels.push(y);
    maxValue = Math.max(maxValue, value);
  }

  return { xLabels, yLabels, values, maxValue };
}

export function HeatmapPanel({ panel, onEdit, onDelete, onDuplicate }: HeatmapPanelProps) {
  return (
    <PanelWrapper panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate}>
      {(data, isLoading) => {
        if (isLoading) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          );
        }

        const rows = data?.rows ?? [];
        if (rows.length === 0) {
          return (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              No data for heatmap distribution.
            </div>
          );
        }

        const heatmap = buildHeatmapData(rows);
        if (!heatmap) {
          return (
            <div className="flex-1 flex items-center justify-center px-6 text-center text-xs text-muted-foreground">
              Heatmap queries must return unique x/time, y/bucket, and non-negative numeric value/count columns.
            </div>
          );
        }

        return (
          <div className="flex-1 flex flex-col justify-center gap-1 overflow-x-auto py-2">
            {heatmap.yLabels.map((yLabel) => (
              <div key={yLabel} className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="w-20 text-right text-muted-foreground truncate" title={yLabel}>{yLabel}</span>
                <div className="flex-1 flex gap-1 h-5">
                  {heatmap.xLabels.map((xLabel) => {
                    const value = heatmap.values.get(`${yLabel}\u0000${xLabel}`);
                    const intensity = value === undefined
                      ? 0
                      : value === 0 || heatmap.maxValue === 0
                      ? 0.08
                      : 0.18 + 0.82 * (value / heatmap.maxValue);
                    return (
                      <div
                        key={xLabel}
                        className="flex-1 min-w-4 rounded-sm transition-all hover:ring-1 hover:ring-primary"
                        style={{ backgroundColor: `rgb(59 130 246 / ${intensity})` }}
                        title={value === undefined ? `${yLabel} at ${xLabel}: no observation` : `${yLabel} at ${xLabel}: ${value}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      }}
    </PanelWrapper>
  );
}
