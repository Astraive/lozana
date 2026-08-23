import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  GitBranch,
  BrainCircuit,
  Split,
  AlertTriangle,
  Clock,
  ListTree,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { LozaEvent } from "@/types/event";

interface EventDetailDrawerProps {
  event: LozaEvent | Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewTrace?: (traceId: string) => void;
  onReconstructCortex?: (incidentOrTraceId: string) => void;
  onAddToDiff?: (event: LozaEvent | Record<string, unknown>) => void;
}

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
  onViewTrace,
  onReconstructCortex,
  onAddToDiff,
}: EventDetailDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [attrSearch, setAttrSearch] = useState("");

  if (!event) return null;

  const eventId = String(event.event_id || "");
  const traceId = String(event.trace_id || "");
  const incidentId = String(event.incident_id || "");
  const service = String(event.service || "unknown");
  const level = String(event.level || "info").toLowerCase();
  const timestamp = String(event.timestamp || "");
  const durationMs = typeof event.duration_ms === "number" ? event.duration_ms : undefined;
  const eventName = String(event.event || "");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const attrs = (event.attrs && typeof event.attrs === "object" ? event.attrs : {}) as Record<
    string,
    unknown
  >;

  const filteredAttrs = Object.entries(attrs).filter(
    ([k, v]) =>
      k.toLowerCase().includes(attrSearch.toLowerCase()) ||
      String(v).toLowerCase().includes(attrSearch.toLowerCase())
  );

  const checkpoints = Array.isArray(event.checkpoints) ? event.checkpoints : [];
  const processSteps = Array.isArray(event.process) ? event.process : [];
  const hasError = Boolean(event.error_type || event.error_code || event.error_message || event.error_stack);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col">
        {/* Top Header Banner */}
        <div className="p-6 border-b border-border bg-card/80 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs font-mono uppercase px-2 py-0.5 ${
                    level === "error" || level === "fatal"
                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                      : level === "warn"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  }`}
                >
                  {level}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {service}
                </Badge>
                {durationMs !== undefined && (
                  <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-500/30">
                    {durationMs.toFixed(1)}ms
                  </Badge>
                )}
                {Boolean(event.status_code) && (
                  <Badge variant="outline" className="font-mono text-xs">
                    HTTP {String(event.status_code)}
                  </Badge>
                )}
              </div>

              <h2 className="text-base font-bold text-foreground font-mono truncate max-w-md pt-1">
                {eventName || eventId}
              </h2>
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timestamp}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(JSON.stringify(event, null, 2), "json")}
                className="h-8 text-xs gap-1"
              >
                {copiedKey === "json" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                JSON
              </Button>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="flex items-center gap-2 pt-4 flex-wrap">
            {traceId && onViewTrace && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onViewTrace(traceId);
                  onOpenChange(false);
                }}
                className="h-7 text-xs gap-1.5"
              >
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                Trace Waterfall
              </Button>
            )}

            {onReconstructCortex && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onReconstructCortex(incidentId || traceId || eventId);
                  onOpenChange(false);
                }}
                className="h-7 text-xs gap-1.5 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                Reconstruct in Cortex
              </Button>
            )}

            {onAddToDiff && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddToDiff(event);
                  toast.success("Added to comparison diff");
                }}
                className="h-7 text-xs gap-1.5"
              >
                <Split className="h-3.5 w-3.5" />
                Compare Diff
              </Button>
            )}
          </div>
        </div>

        {/* Tabbed Content Body */}
        <div className="p-6 flex-1">
          <Tabs defaultValue="overview" className="w-full space-y-4">
            <TabsList className="grid grid-cols-5 w-full bg-muted/60">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="attributes" className="text-xs">
                Attrs ({Object.keys(attrs).length})
              </TabsTrigger>
              <TabsTrigger value="lifecycle" className="text-xs">
                Lifecycle ({checkpoints.length + processSteps.length})
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-xs" disabled={!hasError}>
                Error {hasError && "(!)"}
              </TabsTrigger>
              <TabsTrigger value="raw" className="text-xs">Raw JSON</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Event ID", val: eventId },
                  { label: "Trace ID", val: traceId },
                  { label: "Span ID", val: event.span_id ? String(event.span_id) : "" },
                  { label: "Incident ID", val: incidentId },
                  { label: "Environment", val: String(event.environment || "") },
                  { label: "Release", val: String(event.release || "") },
                  { label: "Region / Host", val: `${event.region || "—"} / ${event.host || "—"}` },
                  { label: "Outcome / State", val: `${event.outcome || "—"} (${event.event_state || "—"})` },
                  { label: "HTTP Route", val: String(event.route || event.path || "") },
                  { label: "HTTP Method", val: String(event.method || "") },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-card border border-border/70 p-2.5 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      {label}
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs truncate" title={val || "—"}>
                        {val || "—"}
                      </span>
                      {val && (
                        <button
                          onClick={() => handleCopy(val, label)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                          {copiedKey === label ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {Boolean(event.message) && (
                <div className="bg-card border border-border/70 p-3 rounded-lg space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                    Message
                  </span>
                  <p className="text-xs font-mono text-foreground whitespace-pre-wrap">
                    {String(event.message)}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: ATTRIBUTES */}
            <TabsContent value="attributes" className="space-y-3 pt-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={attrSearch}
                  onChange={(e) => setAttrSearch(e.target.value)}
                  placeholder="Search custom attributes..."
                  className="pl-8 text-xs h-8"
                />
              </div>

              {filteredAttrs.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No custom attributes found.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAttrs.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between p-2 rounded-md bg-card border border-border/60 text-xs hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <span className="font-mono font-semibold text-primary truncate max-w-[160px]">
                          {k}
                        </span>
                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 font-mono">
                          {typeof v}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-muted-foreground truncate max-w-[200px]" title={JSON.stringify(v)}>
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                        <button
                          onClick={() => handleCopy(typeof v === "object" ? JSON.stringify(v) : String(v), k)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                        >
                          {copiedKey === k ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: LIFECYCLE MILESTONES */}
            <TabsContent value="lifecycle" className="space-y-4 pt-1">
              {checkpoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Checkpoints Timeline
                  </h4>
                  <div className="space-y-2 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {checkpoints.map((cp, idx) => (
                      <div key={idx} className="flex items-center gap-3 pl-6 relative">
                        <div className="absolute left-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                        <div className="flex-1 flex items-center justify-between p-2 rounded bg-card border border-border/60 text-xs">
                          <span className="font-mono font-medium">{String(cp.name)}</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            +{cp.at_ms}ms
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {processSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ListTree className="h-3.5 w-3.5 text-primary" />
                    Process Steps
                  </h4>
                  <div className="space-y-2">
                    {processSteps.map((step, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-card border border-border/60 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold">
                            Step {step.step || idx + 1}: {String(step.name)}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {String(step.status)}
                          </Badge>
                        </div>
                        {step.duration_ms !== undefined && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Duration: {step.duration_ms}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkpoints.length === 0 && processSteps.length === 0 && (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No intra-span checkpoints or process milestones recorded for this event.
                </div>
              )}
            </TabsContent>

            {/* TAB 4: ERROR & STACK */}
            <TabsContent value="errors" className="space-y-3 pt-1">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono font-bold text-xs">
                    {String(event.error_type || "Error")} ({String(event.error_code || "UNKNOWN")})
                  </span>
                </div>
                <p className="text-xs text-foreground font-mono">
                  {String(event.error_message || event.message || "No error message provided")}
                </p>
              </div>

              {Boolean(event.error_stack) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Stack Trace
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(String(event.error_stack), "stack")}
                      className="h-6 text-xs gap-1"
                    >
                      {copiedKey === "stack" ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy Stack
                    </Button>
                  </div>
                  <pre className="p-3 rounded bg-muted/70 text-[11px] font-mono overflow-x-auto text-red-300 border border-border/70 leading-relaxed">
                    {String(event.error_stack)}
                  </pre>
                </div>
              )}
            </TabsContent>

            {/* TAB 5: RAW JSON */}
            <TabsContent value="raw" className="pt-1">
              <pre className="p-4 rounded-lg bg-muted/60 text-xs font-mono text-foreground border border-border overflow-x-auto max-h-[450px] leading-relaxed">
                {JSON.stringify(event, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
