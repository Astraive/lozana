import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app.store";
import { LQL_LANGUAGE_ID } from "@/lib/lql/monaco-lql";
import { PanelRenderer } from "@/components/panels/PanelRenderer";
import type { Panel, PanelType } from "@/types/dashboard";
import {
  Sparkles,
  LayoutGrid,
  Save,
  LineChart,
  BarChart2,
  PieChart,
  Activity,
  Table as TableIcon,
  BookOpen,
  FileText,
  Zap,
} from "lucide-react";

interface PanelEditorModalProps {
  panel: Panel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPanel: Panel) => void;
}

const PANEL_TYPES: { type: PanelType; label: string; icon: typeof LineChart }[] = [
  { type: "timeseries", label: "Time Series", icon: LineChart },
  { type: "stat", label: "Stat / KPI", icon: Zap },
  { type: "bar", label: "Bar Chart", icon: BarChart2 },
  { type: "pie", label: "Donut / Pie", icon: PieChart },
  { type: "heatmap", label: "Heatmap", icon: Activity },
  { type: "gauge", label: "Gauge", icon: Activity },
  { type: "table", label: "Data Table", icon: TableIcon },
  { type: "logstream", label: "Live Tail", icon: FileText },
  { type: "tracelist", label: "Trace List", icon: LayoutGrid },
  { type: "markdown", label: "Markdown", icon: BookOpen },
];

function PanelEditorForm({ panel, open, onOpenChange, onSave }: PanelEditorModalProps) {
  const { theme } = useAppStore();

  const [title, setTitle] = useState(panel?.title || "New Panel");
  const [description, setDescription] = useState(panel?.description || "");
  const [type, setType] = useState<PanelType>(panel?.type || "timeseries");
  const [query, setQuery] = useState(panel?.query || "from events | limit 100");
  const content = panel?.content || "";
  const [unit, setUnit] = useState<string>(panel?.visualization?.unit || "none");
  const [color, setColor] = useState<string>(panel?.visualization?.color || "#3b82f6");
  const [chartType, setChartType] = useState<"line" | "area">(
    panel?.visualization?.chartType === "line" ? "line" : "area"
  );
  const [sparkline, setSparkline] = useState<boolean>(Boolean(panel?.visualization?.sparkline));

  const handleSave = () => {
    if (!panel) return;
    const updated: Panel = {
      ...panel,
      title,
      description,
      type,
      query,
      content,
      visualization: {
        ...panel.visualization,
        unit: unit === "none" ? undefined : (unit as NonNullable<Panel["visualization"]>["unit"]),
        color,
        chartType,
        sparkline,
      },
    };
    onSave(updated);
    onOpenChange(false);
  };

  const previewPanel: Panel = {
    id: panel?.id || "preview",
    title,
    description,
    type,
    query,
    content,
    position: { x: 0, y: 0, w: 12, h: 6 },
    visualization: {
      unit: unit === "none" ? undefined : (unit as NonNullable<Panel["visualization"]>["unit"]),
      color,
      chartType,
      sparkline,
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Edit Dashboard Panel
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
                <Save className="h-3.5 w-3.5" />
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 flex-1">
          {/* Left Column: Visual Settings */}
          <div className="md:col-span-5 space-y-4 border-r border-border/70 pr-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Panel Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ingest Rate by Service"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description / Subtitle
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="text-xs"
              />
            </div>

            {/* Panel Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Visualization Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PANEL_TYPES.map(({ type: pType, label, icon: Icon }) => (
                  <button
                    key={pType}
                    type="button"
                    onClick={() => setType(pType)}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs text-left transition-colors ${
                      type === pType
                        ? "bg-primary/15 border-primary text-foreground font-semibold"
                        : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visualization Options */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-8 rounded bg-background border border-input px-2 text-xs"
                  >
                    <option value="none">None</option>
                    <option value="count">Count</option>
                    <option value="ms">Milliseconds (ms)</option>
                    <option value="s">Seconds (s)</option>
                    <option value="bytes">Bytes</option>
                    <option value="percent">Percent (%)</option>
                    <option value="req/s">Requests/sec</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Color Palette</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-8 rounded bg-background border border-input px-2 text-xs"
                  >
                    <option value="#3b82f6">Blue (Default)</option>
                    <option value="#10b981">Green (Health)</option>
                    <option value="#ef4444">Red (Errors)</option>
                    <option value="#f59e0b">Amber (Latency)</option>
                    <option value="#8b5cf6">Purple (Cortex)</option>
                    <option value="#ec4899">Pink</option>
                  </select>
                </div>
              </div>

              {type === "timeseries" && (
                <div className="flex items-center gap-4 text-xs pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="chartType"
                      checked={chartType === "area"}
                      onChange={() => setChartType("area")}
                      className="text-primary"
                    />
                    Area Chart
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="chartType"
                      checked={chartType === "line"}
                      onChange={() => setChartType("line")}
                      className="text-primary"
                    />
                    Line Chart
                  </label>
                </div>
              )}

              {type === "stat" && (
                <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sparkline}
                    onChange={(e) => setSparkline(e.target.checked)}
                    className="rounded text-primary"
                  />
                  Show Sparkline Trend
                </label>
              )}
            </div>
          </div>

          {/* Right Column: Query Editor & Live Preview */}
          <div className="md:col-span-7 space-y-3 flex flex-col">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                LQL Query
              </label>
              <div className="h-32 rounded border border-border/80 overflow-hidden">
                <Editor
                  height="100%"
                  language={LQL_LANGUAGE_ID}
                  theme={theme === "light" ? "lozana-light" : "lozana-dark"}
                  value={query}
                  onChange={(val) => setQuery(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 4, bottom: 4 },
                  }}
                />
              </div>
            </div>

            {/* Live Panel Preview Box */}
            <div className="flex-1 flex flex-col space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Live Preview
              </label>
              <div className="h-56 border border-border/80 rounded-lg overflow-hidden bg-card/50">
                <PanelRenderer panel={previewPanel} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PanelEditorModal(props: PanelEditorModalProps) {
  return <PanelEditorForm key={JSON.stringify(props.panel)} {...props} />;
}
