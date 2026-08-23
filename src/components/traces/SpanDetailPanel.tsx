import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  BrainCircuit,
  AlertTriangle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { TraceSpan } from "@/lib/traces/trace-builder";

interface SpanDetailPanelProps {
  span: TraceSpan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReconstructCortex?: (traceId: string) => void;
}

export function SpanDetailPanel({
  span,
  open,
  onOpenChange,
  onReconstructCortex,
}: SpanDetailPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [attrSearch, setAttrSearch] = useState("");

  if (!span) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const attrs = span.attrs || {};
  const filteredAttrs = Object.entries(attrs).filter(
    ([k, v]) =>
      k.toLowerCase().includes(attrSearch.toLowerCase()) ||
      String(v).toLowerCase().includes(attrSearch.toLowerCase())
  );

  const checkpoints = span.checkpoints || [];
  const processSteps = span.process || [];
  const hasError = Boolean(span.error_type || span.error_message || span.error_stack);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border bg-card/80 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="font-mono text-xs uppercase"
                  style={{ borderColor: span.service_color, color: span.service_color }}
                >
                  {span.service}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-500/30">
                  {span.duration_ms.toFixed(1)}ms
                </Badge>
                {span.status_code && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    HTTP {span.status_code}
                  </Badge>
                )}
                {hasError && (
                  <Badge variant="destructive" className="font-mono text-xs">
                    Error
                  </Badge>
                )}
              </div>

              <h2 className="text-sm font-bold font-mono text-foreground truncate max-w-md pt-1">
                {span.name}
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                Offset: +{span.start_offset_ms}ms • Timestamp: {span.timestamp}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(JSON.stringify(span.rawEvent || span, null, 2), "json")}
                className="h-7 text-xs gap-1"
              >
                {copiedKey === "json" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                JSON
              </Button>
            </div>
          </div>

          {onReconstructCortex && (
            <div className="pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onReconstructCortex(span.trace_id);
                  onOpenChange(false);
                }}
                className="h-7 text-xs gap-1.5 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                Reconstruct Trace in Cortex RCA
              </Button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1">
          <Tabs defaultValue="overview" className="w-full space-y-4">
            <TabsList className="grid grid-cols-5 w-full bg-muted/60">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="checkpoints" className="text-xs">
                Checkpoints ({checkpoints.length})
              </TabsTrigger>
              <TabsTrigger value="process" className="text-xs">
                Steps ({processSteps.length})
              </TabsTrigger>
              <TabsTrigger value="attributes" className="text-xs">
                Attrs ({Object.keys(attrs).length})
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-xs" disabled={!hasError}>
                Error
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Span ID", val: span.span_id },
                  { label: "Parent Span ID", val: span.parent_span_id || "None (Root)" },
                  { label: "Trace ID", val: span.trace_id },
                  { label: "Service", val: span.service },
                  { label: "HTTP Route", val: span.route || "—" },
                  { label: "HTTP Method", val: span.method || "—" },
                  { label: "Kind", val: span.kind },
                  { label: "Outcome", val: span.outcome },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-card border border-border/70 p-2.5 rounded-lg space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      {label}
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs truncate" title={val}>
                        {val}
                      </span>
                      {val && val !== "None (Root)" && val !== "—" && (
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
            </TabsContent>

            {/* Checkpoints */}
            <TabsContent value="checkpoints" className="space-y-3 pt-1">
              {checkpoints.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No intra-span checkpoints for this span.
                </div>
              ) : (
                <div className="space-y-2">
                  {checkpoints.map((cp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded bg-card border border-border/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-mono font-semibold">{cp.name}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] text-emerald-400">
                        +{cp.at_ms}ms
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Process Steps */}
            <TabsContent value="process" className="space-y-3 pt-1">
              {processSteps.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  No process steps recorded for this span.
                </div>
              ) : (
                <div className="space-y-2">
                  {processSteps.map((step, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-card border border-border/60 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">
                          Step {step.step || idx + 1}: {step.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {step.status}
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
              )}
            </TabsContent>

            {/* Attributes */}
            <TabsContent value="attributes" className="space-y-3 pt-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={attrSearch}
                  onChange={(e) => setAttrSearch(e.target.value)}
                  placeholder="Search span attributes..."
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
                      className="flex items-center justify-between p-2 rounded bg-card border border-border/60 text-xs"
                    >
                      <span className="font-mono font-semibold text-primary truncate max-w-[150px]">
                        {k}
                      </span>
                      <span className="font-mono text-muted-foreground truncate max-w-[200px]" title={JSON.stringify(v)}>
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Error & Stack */}
            <TabsContent value="errors" className="space-y-3 pt-1">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono font-bold text-xs">
                    {span.error_type || "Span Error"}
                  </span>
                </div>
                <p className="text-xs text-foreground font-mono">
                  {span.error_message || "Execution error encountered during span execution"}
                </p>
              </div>

              {span.error_stack && (
                <pre className="p-3 rounded bg-muted/70 text-[11px] font-mono overflow-x-auto text-red-300 border border-border/70 leading-relaxed">
                  {span.error_stack}
                </pre>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
