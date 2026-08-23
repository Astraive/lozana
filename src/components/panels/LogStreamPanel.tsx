import { useState, useRef } from "react";
import { PanelWrapper } from "./PanelWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import type { Panel } from "@/types/dashboard";

interface LogStreamPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function LogStreamPanel({ panel, onEdit, onDelete, onDuplicate }: LogStreamPanelProps) {
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

        return (
          <div className="flex-1 flex flex-col overflow-hidden space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 pb-1">
              <span className="flex items-center gap-1.5 font-mono">
                <span className={`h-2 w-2 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                {paused ? "Paused" : "Live Tailing"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaused((p) => !p)}
                  className="h-5 text-[10px] px-1.5 gap-1"
                >
                  {paused ? <Play className="h-2.5 w-2.5" /> : <Pause className="h-2.5 w-2.5" />}
                  {paused ? "Resume" : "Pause"}
                </Button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] p-1 bg-black/30 rounded border border-border/40">
              {rows.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground/60">
                  Waiting for live events...
                </div>
              ) : (
                rows.map((r, i) => {
                  const level = String(r.level || "info").toLowerCase();
                  const time = String(r.timestamp || "").substring(11, 19);
                  const service = String(r.service || "sys");
                  const msg = String(r.message || r.event || JSON.stringify(r));

                  return (
                    <div key={i} className="flex items-start gap-2 leading-tight py-0.5 hover:bg-white/5 rounded px-1">
                      <span className="text-muted-foreground/60 text-[10px] select-none">{time}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase px-1 py-0 ${
                          level === "error" || level === "fatal"
                            ? "text-red-400 border-red-500/30"
                            : level === "warn"
                            ? "text-amber-400 border-amber-500/30"
                            : "text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {level}
                      </Badge>
                      <span className="text-purple-400 text-[10px]">{service}</span>
                      <span className="text-foreground truncate flex-1">{msg}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }}
    </PanelWrapper>
  );
}
