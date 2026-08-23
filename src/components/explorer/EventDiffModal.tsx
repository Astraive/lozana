import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Split, ArrowLeftRight, Trash2 } from "lucide-react";
import type { LozaEvent } from "@/types/event";

interface EventDiffModalProps {
  events: (LozaEvent | Record<string, unknown>)[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClearDiff?: () => void;
}

export function EventDiffModal({
  events,
  open,
  onOpenChange,
  onClearDiff,
}: EventDiffModalProps) {
  const [swapped, setSwapped] = useState(false);
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  if (events.length < 2) return null;

  const left = swapped ? events[1] : events[0];
  const right = swapped ? events[0] : events[1];

  // Collect all distinct keys
  const allKeys = Array.from(
    new Set([...Object.keys(left), ...Object.keys(right)])
  ).sort();

  // Also collect all attrs keys
  const leftAttrs = (left.attrs && typeof left.attrs === "object" ? left.attrs : {}) as Record<string, unknown>;
  const rightAttrs = (right.attrs && typeof right.attrs === "object" ? right.attrs : {}) as Record<string, unknown>;
  const allAttrKeys = Array.from(
    new Set([...Object.keys(leftAttrs), ...Object.keys(rightAttrs)])
  ).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Split className="h-4 w-4 text-purple-400" />
              Event Comparison Diff
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOnlyDifferences((prev) => !prev)}
                className={`h-7 text-xs ${onlyDifferences ? "bg-primary/20 text-primary" : ""}`}
              >
                {onlyDifferences ? "Show All Fields" : "Show Diffs Only"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSwapped((prev) => !prev)}
                className="h-7 text-xs gap-1"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Swap
              </Button>
              {onClearDiff && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearDiff();
                    onOpenChange(false);
                  }}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs">
            Comparing event <code>{String(left.event_id || "A")}</code> against <code>{String(right.event_id || "B")}</code>
          </DialogDescription>
        </DialogHeader>

        {/* Side-by-side header cards */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-muted/40 rounded-lg border border-border/70 space-y-1">
            <Badge variant="outline" className="text-[10px] font-mono">Event A (Left)</Badge>
            <h4 className="text-xs font-bold font-mono truncate">{String(left.event || left.event_id || "Event A")}</h4>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
              <span>{String(left.service || "unknown")}</span>
              <span>•</span>
              <span className="uppercase text-[10px]">{String(left.level || "info")}</span>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg border border-border/70 space-y-1">
            <Badge variant="outline" className="text-[10px] font-mono">Event B (Right)</Badge>
            <h4 className="text-xs font-bold font-mono truncate">{String(right.event || right.event_id || "Event B")}</h4>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
              <span>{String(right.service || "unknown")}</span>
              <span>•</span>
              <span className="uppercase text-[10px]">{String(right.level || "info")}</span>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="space-y-4 pt-2">
          {/* Canonical Fields */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Canonical Attributes
            </span>
            <div className="border border-border/70 rounded-lg overflow-hidden divide-y divide-border/50">
              {allKeys
                .filter((k) => k !== "attrs" && k !== "process" && k !== "checkpoints")
                .map((key) => {
                  const leftVal = (left as Record<string, unknown>)[key];
                  const rightVal = (right as Record<string, unknown>)[key];
                  const isDiff = JSON.stringify(leftVal) !== JSON.stringify(rightVal);
                  if (onlyDifferences && !isDiff) return null;

                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-12 text-xs p-2 items-center ${
                        isDiff ? "bg-amber-500/10 dark:bg-amber-500/15" : "bg-card"
                      }`}
                    >
                      <div className="col-span-3 font-mono font-medium text-muted-foreground truncate" title={key}>
                        {key}
                      </div>
                      <div className="col-span-4 font-mono truncate px-1 text-foreground" title={String(leftVal)}>
                        {leftVal !== undefined && leftVal !== null ? String(leftVal) : <span className="text-muted-foreground/40">—</span>}
                      </div>
                      <div className="col-span-1 text-center font-bold text-muted-foreground">
                        {isDiff ? <span className="text-amber-400">≠</span> : <span className="text-emerald-400">=</span>}
                      </div>
                      <div className="col-span-4 font-mono truncate px-1 text-foreground" title={String(rightVal)}>
                        {rightVal !== undefined && rightVal !== null ? String(rightVal) : <span className="text-muted-foreground/40">—</span>}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Custom Attrs */}
          {allAttrKeys.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Custom Attributes (attrs.*)
              </span>
              <div className="border border-border/70 rounded-lg overflow-hidden divide-y divide-border/50">
                {allAttrKeys.map((key) => {
                  const leftVal = leftAttrs[key];
                  const rightVal = rightAttrs[key];
                  const isDiff = JSON.stringify(leftVal) !== JSON.stringify(rightVal);

                  if (onlyDifferences && !isDiff) return null;

                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-12 text-xs p-2 items-center ${
                        isDiff ? "bg-purple-500/10 dark:bg-purple-500/15" : "bg-card"
                      }`}
                    >
                      <div className="col-span-3 font-mono font-medium text-purple-400 truncate" title={`attrs.${key}`}>
                        attrs.{key}
                      </div>
                      <div className="col-span-4 font-mono truncate px-1 text-foreground" title={JSON.stringify(leftVal)}>
                        {leftVal !== undefined && leftVal !== null ? String(leftVal) : <span className="text-muted-foreground/40">—</span>}
                      </div>
                      <div className="col-span-1 text-center font-bold text-muted-foreground">
                        {isDiff ? <span className="text-purple-400">≠</span> : <span className="text-emerald-400">=</span>}
                      </div>
                      <div className="col-span-4 font-mono truncate px-1 text-foreground" title={JSON.stringify(rightVal)}>
                        {rightVal !== undefined && rightVal !== null ? String(rightVal) : <span className="text-muted-foreground/40">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
