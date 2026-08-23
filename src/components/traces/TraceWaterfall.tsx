import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Clock,
  GitBranch,
  AlertTriangle,
  Flame,
} from "lucide-react";
import type { TraceTree, TraceSpan } from "@/lib/traces/trace-builder";

interface TraceWaterfallProps {
  traceTree: TraceTree;
  selectedSpanId?: string;
  onSelectSpan: (span: TraceSpan) => void;
}

export function TraceWaterfall({
  traceTree,
  selectedSpanId,
  onSelectSpan,
}: TraceWaterfallProps) {
  const [collapsedSpans, setCollapsedSpans] = useState<Record<string, boolean>>({});
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(true);

  const toggleCollapse = (spanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
  };

  const expandAll = () => setCollapsedSpans({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    for (const s of traceTree.all_spans) {
      if (s.children.length > 0) all[s.id] = true;
    }
    setCollapsedSpans(all);
  };

  const totalDuration = Math.max(1, traceTree.total_duration_ms);

  // Recursive flat rendering of visible spans
  const renderSpanRow = (span: TraceSpan) => {
    const isCollapsed = collapsedSpans[span.id];
    const isSelected = selectedSpanId === span.id;
    const isCritical = highlightCriticalPath && span.is_critical_path;
    const hasChildren = span.children.length > 0;

    // Calculate Gantt bar positions
    const leftPercent = Math.min(100, Math.max(0, (span.start_offset_ms / totalDuration) * 100));
    const widthPercent = Math.min(
      100 - leftPercent,
      Math.max(1, (span.duration_ms / totalDuration) * 100)
    );

    return (
      <div key={span.id} className="flex flex-col">
        {/* Row Item */}
        <div
          onClick={() => onSelectSpan(span)}
          className={`flex items-center h-10 border-b border-border/40 hover:bg-accent/40 cursor-pointer transition-colors text-xs select-none ${
            isSelected
              ? "bg-primary/15 hover:bg-primary/20"
              : isCritical
              ? "bg-amber-500/5 dark:bg-amber-500/10"
              : ""
          }`}
        >
          {/* Left Column: Span Hierarchy & Info */}
          <div
            className="w-[45%] flex items-center pr-2 overflow-hidden flex-shrink-0"
            style={{ paddingLeft: `${Math.max(8, span.depth * 20 + 8)}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(span.id, e)}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground mr-1 flex-shrink-0"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <div className="w-5 mr-1 flex-shrink-0" />
            )}

            {/* Service Color Pill */}
            <div
              className="h-2.5 w-2.5 rounded-full mr-2 flex-shrink-0"
              style={{ backgroundColor: span.service_color || "#3b82f6" }}
            />

            <span
              className="font-mono text-[11px] font-semibold text-foreground truncate mr-2"
              title={span.name}
            >
              {span.name}
            </span>

            <span className="text-[10px] text-muted-foreground font-mono truncate mr-2">
              {span.service}
            </span>

            {span.status_code && (
              <Badge
                variant="outline"
                className={`text-[9px] h-4 px-1 font-mono mr-1.5 ${
                  span.status_code >= 500
                    ? "text-red-400 border-red-500/40 bg-red-500/10"
                    : span.status_code >= 400
                    ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                    : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                }`}
              >
                {span.status_code}
              </Badge>
            )}

            {(span.level === "error" || span.level === "fatal" || span.error_type) && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mr-1" />
            )}

            {isCritical && (
              <span title="Critical Path" className="flex items-center">
                <Flame className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mr-1" />
              </span>
            )}
          </div>

          {/* Right Column: Gantt Timeline Bar */}
          <div className="w-[55%] h-full flex items-center pr-4 pl-2 relative border-l border-border/50">
            {/* Timeline Bar */}
            <div
              className={`h-5 rounded relative flex items-center transition-all shadow-sm ${
                isCritical ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-background" : ""
              }`}
              style={{
                marginLeft: `${leftPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: span.service_color || "#3b82f6",
                minWidth: "6px",
              }}
              title={`${span.name}: ${span.duration_ms}ms (offset +${span.start_offset_ms}ms)`}
            >
              {/* Duration Text label inside or outside bar */}
              <span className="text-[10px] font-mono font-bold text-white px-1.5 truncate drop-shadow">
                {span.duration_ms >= 1 ? `${span.duration_ms.toFixed(0)}ms` : "<1ms"}
              </span>

              {/* Intra-span Checkpoint Micro-Pills */}
              {span.checkpoints && span.checkpoints.length > 0 && (
                <div className="absolute inset-0 flex items-center pointer-events-auto">
                  {span.checkpoints.map((cp, idx) => {
                    const cpOffset = Number(cp.at_ms || 0);
                    const cpPercent = Math.min(
                      100,
                      Math.max(0, (cpOffset / (span.duration_ms || 1)) * 100)
                    );

                    return (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 w-1 bg-white ring-1 ring-black/40 rounded-full cursor-help hover:w-1.5 hover:bg-amber-300 transition-all z-10"
                        style={{ left: `${cpPercent}%` }}
                        title={`Checkpoint: ${cp.name} (+${cp.at_ms}ms)`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children Spans */}
        {!isCollapsed && span.children.map((child) => renderSpanRow(child))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Top Summary Bar */}
      <div className="p-3 bg-card/80 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <GitBranch className="h-4 w-4 text-primary" />
              <span>Trace:</span>
              <code className="font-mono text-xs text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {traceTree.trace_id || "unknown"}
              </code>
            </div>

            <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-500/30">
              <Clock className="h-3 w-3 mr-1" />
              {traceTree.total_duration_ms.toFixed(1)}ms total
            </Badge>

            <Badge variant="secondary" className="font-mono text-xs">
              {traceTree.span_count} spans
            </Badge>

            <Badge variant="secondary" className="font-mono text-xs">
              {traceTree.service_count} services
            </Badge>

            {traceTree.error_count > 0 && (
              <Badge variant="destructive" className="font-mono text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {traceTree.error_count} errors
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHighlightCriticalPath((p) => !p)}
              className={`h-7 text-xs gap-1.5 ${
                highlightCriticalPath ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : ""
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Critical Path
            </Button>

            <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
              Collapse All
            </Button>
          </div>
        </div>

        {/* Service Color Distribution Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
          {traceTree.services.map((svc) => (
            <div
              key={svc.service}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 border border-border/50 text-[11px] font-mono flex-shrink-0"
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: svc.color }} />
              <span className="font-semibold text-foreground">{svc.service}</span>
              <span className="text-muted-foreground text-[10px]">({svc.span_count} spans)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Axis Header */}
      <div className="flex items-center h-7 bg-muted/50 border-b border-border text-[10px] font-mono text-muted-foreground select-none">
        <div className="w-[45%] pl-4 font-semibold uppercase tracking-wider">
          Span Hierarchy & Service
        </div>
        <div className="w-[55%] pr-4 pl-2 flex justify-between border-l border-border/50">
          <span>0ms</span>
          <span>{(totalDuration * 0.25).toFixed(0)}ms</span>
          <span>{(totalDuration * 0.5).toFixed(0)}ms</span>
          <span>{(totalDuration * 0.75).toFixed(0)}ms</span>
          <span>{totalDuration.toFixed(0)}ms</span>
        </div>
      </div>

      {/* Waterfall Spans Scrollable Container */}
      <div className="flex-1 overflow-y-auto">
        {traceTree.root_spans.map((root) => renderSpanRow(root))}
      </div>
    </div>
  );
}
