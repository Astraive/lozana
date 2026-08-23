import { PanelWrapper } from "./PanelWrapper";
import { PieChart } from "@/components/charts/PieChart";
import type { Panel } from "@/types/dashboard";

interface PiePanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function PiePanel({ panel, onEdit, onDelete, onDuplicate }: PiePanelProps) {
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
              No data for distribution chart.
            </div>
          );
        }

        const chartData = rows.slice(0, 8).map((r) => {
          const keys = Object.keys(r);
          const nameKey =
            keys.find((k) => k === "service" || k === "level" || k === "kind" || k === "outcome" || k === "status_code") ||
            keys[0];
          const valKey =
            keys.find((k) => k !== nameKey && (k.includes("count") || k.includes("val"))) ||
            keys[1] ||
            keys[0];

          return {
            name: String(r[nameKey] ?? "Category"),
            value: Number(r[valKey] ?? 1),
          };
        });

        return (
          <div className="flex-1 min-h-[160px] w-full">
            <PieChart
              data={chartData}
            />
          </div>
        );
      }}
    </PanelWrapper>
  );
}
