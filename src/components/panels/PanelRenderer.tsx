import { StatPanel } from "./StatPanel";
import { TimeSeriesPanel } from "./TimeSeriesPanel";
import { BarPanel } from "./BarPanel";
import { PiePanel } from "./PiePanel";
import { HeatmapPanel } from "./HeatmapPanel";
import { GaugePanel } from "./GaugePanel";
import { TablePanel } from "./TablePanel";
import { LogStreamPanel } from "./LogStreamPanel";
import { TraceListPanel } from "./TraceListPanel";
import { MarkdownPanel } from "./MarkdownPanel";
import type { Panel } from "@/types/dashboard";

interface PanelRendererProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function PanelRenderer({ panel, onEdit, onDelete, onDuplicate }: PanelRendererProps) {
  switch (panel.type) {
    case "stat":
      return <StatPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "timeseries":
      return <TimeSeriesPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "bar":
      return <BarPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "pie":
      return <PiePanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "heatmap":
      return <HeatmapPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "gauge":
      return <GaugePanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "table":
      return <TablePanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "logstream":
      return <LogStreamPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "tracelist":
      return <TraceListPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    case "markdown":
      return <MarkdownPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
    default:
      return <TimeSeriesPanel panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />;
  }
}
