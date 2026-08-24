import { PanelWrapper } from "./PanelWrapper";
import type { Panel } from "@/types/dashboard";

interface StatPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function StatPanel({ panel, onEdit, onDelete, onDuplicate }: StatPanelProps) {
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
        let val: number | string = "0";

        if (rows.length > 0) {
          const firstRow = rows[0];
          const keys = Object.keys(firstRow);
          // Find first numeric or count field
          const targetKey =
            keys.find((k) => k.includes("count") || k.includes("p95") || k.includes("avg") || k.includes("val") || k.includes("dcount")) ||
            keys[0];
          val = firstRow[targetKey] as number | string;
        }

        const numVal = Number(val);
        const isNumeric = !isNaN(numVal);

        // Check thresholds
        let valueColor = panel.visualization?.color || "#3b82f6";
        if (isNumeric && panel.visualization?.thresholds) {
          const sorted = [...panel.visualization.thresholds].sort((a, b) => b.value - a.value);
          for (const th of sorted) {
            if (numVal >= th.value) {
              valueColor = th.color;
              break;
            }
          }
        }

        const formatted = isNumeric
          ? numVal >= 1_000_000
            ? `${(numVal / 1_000_000).toFixed(1)}M`
            : numVal >= 1_000
            ? `${(numVal / 1_000).toFixed(1)}k`
            : numVal.toFixed(numVal % 1 === 0 ? 0 : 2)
          : String(val);

        const unit = panel.visualization?.unit;
        const unitSuffix = unit && unit !== "none" && unit !== "count" ? ` ${unit}` : "";

        return (
          <div className="flex-1 flex flex-col justify-center items-center py-2 relative">
            <div className="text-center space-y-1">
              <div
                className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono transition-colors"
                style={{ color: valueColor }}
              >
                {formatted}
                <span className="text-sm font-normal text-muted-foreground ml-1">{unitSuffix}</span>
              </div>
            </div>

            {panel.visualization?.sparkline && rows.length > 1 && (
              <div className="w-full h-8 mt-2 flex items-end justify-center gap-1 opacity-75">
                {rows.slice(0, 20).map((r, i) => {
                  const rVal = Number(Object.values(r)[0] || 1);
                  return (
                    <div
                      key={i}
                      className="w-1.5 rounded-t transition-all"
                      style={{
                        height: `${Math.max(15, Math.min(100, (rVal / (numVal || 1)) * 100))}%`,
                        backgroundColor: valueColor,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      }}
    </PanelWrapper>
  );
}
