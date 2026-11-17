import { PanelWrapper } from "./PanelWrapper";
import { buildHeatmapData } from "@/lib/panel-math";
import type { Panel } from "@/types/dashboard";

export { buildHeatmapData } from "@/lib/panel-math";

interface HeatmapPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
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
