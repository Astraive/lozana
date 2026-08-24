import { PanelWrapper } from "./PanelWrapper";
import { BarChart } from "@/components/charts/BarChart";
import type { Panel } from "@/types/dashboard";

interface BarPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function BarPanel({ panel, onEdit, onDelete, onDuplicate }: BarPanelProps) {
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
              No data for bar chart.
            </div>
          );
        }

        const chartData = rows.slice(0, 15).map((r) => {
          const keys = Object.keys(r);
          const nameKey =
            keys.find((k) => k === "service" || k === "route" || k === "level" || k === "status_code" || k === "error_type") ||
            keys[0];
          const valKey =
            keys.find((k) => k !== nameKey && (k.includes("count") || k.includes("duration") || k.includes("p95") || k.includes("avg"))) ||
            keys[1] ||
            keys[0];

          return {
            name: String(r[nameKey] ?? "Item"),
            value: Number(r[valKey] ?? 0),
          };
        });

        return (
          <div className="flex-1 min-h-[160px] w-full">
            <BarChart
              data={chartData}
              xField="name"
              yField="value"
              color={panel.visualization?.color}
            />
          </div>
        );
      }}
    </PanelWrapper>
  );
}
