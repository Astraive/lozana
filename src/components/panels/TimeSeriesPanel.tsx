import { PanelWrapper } from "./PanelWrapper";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import type { Panel } from "@/types/dashboard";

interface TimeSeriesPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function TimeSeriesPanel({ panel, onEdit, onDelete, onDuplicate }: TimeSeriesPanelProps) {
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
              No time-series data found.
            </div>
          );
        }

        const chartData = rows.map((r) => {
          const timestamp = String(r.bin || r.bin_timestamp || r.timestamp || "");
          const value = Number(
            r.event_count || r.count_ || r.count || r.p95_duration_ms || r.p99_duration_ms || r.duration_ms || Object.values(r)[1] || 0
          );
          const service = String(r.service || r.status_code || "series");
          return { timestamp, value, service };
        });

        return (
          <div className="flex-1 min-h-[160px] w-full">
            <TimeSeriesChart
              data={chartData}
              xField="timestamp"
              yField="value"
              color={panel.visualization?.color}
            />
          </div>
        );
      }}
    </PanelWrapper>
  );
}
