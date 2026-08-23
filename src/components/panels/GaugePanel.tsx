import { PanelWrapper } from "./PanelWrapper";
import type { Panel } from "@/types/dashboard";

interface GaugePanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function GaugePanel({ panel, onEdit, onDelete, onDuplicate }: GaugePanelProps) {
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
        let val = 0;
        if (rows.length > 0) {
          const first = rows[0];
          const k = Object.keys(first)[0];
          val = Number(first[k]) || 0;
        }

        const min = panel.visualization?.gaugeMin ?? 0;
        const max = panel.visualization?.gaugeMax ?? 100;
        const clamped = Math.max(min, Math.min(max, val));
        const percentage = ((clamped - min) / (max - min)) * 100;

        // Angle from -90 to +90 degrees for half circle
        const angle = (percentage / 100) * 180 - 90;

        let arcColor = panel.visualization?.color || "#3b82f6";
        if (panel.visualization?.thresholds) {
          const sorted = [...panel.visualization.thresholds].sort((a, b) => b.value - a.value);
          for (const th of sorted) {
            if (val >= th.value) {
              arcColor = th.color;
              break;
            }
          }
        }

        return (
          <div className="flex-1 flex flex-col items-center justify-center relative py-2">
            <div className="relative w-36 h-20 flex items-end justify-center overflow-hidden">
              {/* Background Arc */}
              <div className="absolute top-0 w-36 h-36 rounded-full border-[12px] border-muted" />

              {/* Colored Indicator Arc */}
              <div
                className="absolute top-0 w-36 h-36 rounded-full border-[12px] transition-all duration-500"
                style={{
                  borderColor: arcColor,
                  clipPath: `polygon(50% 50%, 0 0, 100% 0, 100% 100%)`,
                  transform: `rotate(${angle}deg)`,
                }}
              />

              <div className="z-10 text-center -mb-1">
                <span className="text-2xl font-bold font-mono" style={{ color: arcColor }}>
                  {val.toFixed(val % 1 === 0 ? 0 : 1)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {panel.visualization?.unit || "%"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between w-36 text-[10px] text-muted-foreground font-mono mt-1 px-1">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        );
      }}
    </PanelWrapper>
  );
}
