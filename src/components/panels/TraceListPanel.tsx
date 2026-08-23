import { PanelWrapper } from "./PanelWrapper";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Panel } from "@/types/dashboard";

interface TraceListPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function TraceListPanel({ panel, onEdit, onDelete, onDuplicate }: TraceListPanelProps) {
  const navigate = useNavigate();

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
              No recent traces found.
            </div>
          );
        }

        return (
          <div className="flex-1 overflow-y-auto space-y-1.5 p-1">
            {rows.slice(0, 20).map((r, i) => {
              const traceId = String(r.trace_id || `trace-${i}`);
              const service = String(r.service || "service");
              const duration = Number(r.duration_ms || r.max_duration_ms || 0);
              const count = Number(r.event_count || r.count_ || r.count || 1);

              return (
                <div
                  key={traceId}
                  onClick={() => navigate(`/traces?trace_id=${encodeURIComponent(traceId)}`)}
                  className="flex items-center justify-between p-2 rounded-md bg-card border border-border/50 hover:bg-accent/40 cursor-pointer transition-colors text-xs group"
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <GitBranch className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="font-mono text-[11px] font-semibold text-foreground truncate">
                      {traceId.substring(0, 16)}…
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {service}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {count} spans
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
                      {duration > 0 ? `${duration.toFixed(0)}ms` : "<1ms"}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }}
    </PanelWrapper>
  );
}
