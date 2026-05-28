import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTraceEvents } from "@/lib/hooks";
import {
  Search,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Copy,
  Check,
} from "lucide-react";

interface TraceSpan {
  event_id: string;
  timestamp: string;
  service: string;
  event: string;
  level: string;
  outcome?: string;
  duration_ms?: number;
  message?: string;
  trace_id?: string;
  span_id?: string;
  error_code?: string;
  [key: string]: unknown;
}

/* -- Brand Colors (level colors) ------------------------------------------- */

const BRAND = {
  primary: "#6F00FF",
  accent: "#E9B3FB",
  destructive: "#FF5C7A",
  muted: "#FFF1F1",
  slate: "#64748b",
} as const;

/* -- Skeletons ------------------------------------------------------------- */

function TraceSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
          <div className="h-4 w-4 bg-muted/60 rounded animate-pulse" />
          <div className="h-4 w-40 bg-muted/60 rounded animate-pulse" />
          <div className="flex-1 h-5 bg-muted/40 rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted/60 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* -- Detail Row ------------------------------------------------------------ */

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-start gap-2 group">
      <span className="w-20 shrink-0 text-[11px] text-muted-foreground pt-0.5">
        {label}
      </span>
      <span
        className={cn(
          "flex-1 text-xs break-all",
          mono && "font-mono text-accent",
        )}
      >
        {value}
      </span>
      {mono && value !== "\u2014" && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          {copied ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  );
}

/* -- Level Color ----------------------------------------------------------- */

function levelColor(level: string): string {
  switch (level) {
    case "error":
    case "fatal":
      return BRAND.destructive;
    case "warn":
      return BRAND.muted;
    case "info":
      return BRAND.accent;
    case "debug":
      return BRAND.slate;
    default:
      return BRAND.primary;
  }
}

/* -- Page ------------------------------------------------------------------ */

export default function TracesPage() {
  const [traceId, setTraceId] = useState("");
  const [searchId, setSearchId] = useState("");
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

  const traceQuery = useTraceEvents(searchId);

  const handleSearch = useCallback(() => {
    if (!traceId.trim()) return;
    setSelectedSpan(null);
    setExpandedSpans(new Set());
    setSearchId(traceId.trim());
  }, [traceId]);

  const spans = (traceQuery.data?.rows ?? []) as TraceSpan[];
  const isLoading = traceQuery.isLoading;
  const error = traceQuery.error ? String(traceQuery.error) : null;
  const hasSearched = searchId.length > 0;

  const minTs =
    spans.length > 0 ? new Date(spans[0].timestamp).getTime() : 0;
  const maxDuration = Math.max(
    ...spans.map((s) => Number(s.duration_ms || 0)),
    1,
  );

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Traces</h1>
        <p className="text-sm text-muted-foreground">
          Distributed trace timelines with waterfall visualization
        </p>
      </div>

      {/* -- Search -------------------------------------------------------- */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter trace_id..."
            className="h-10 font-mono text-sm bg-card border-border pl-9 focus-visible:ring-primary/30"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading || !traceId.trim()}
          className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-5"
        >
          {isLoading ? (
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-1.5" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* -- Error --------------------------------------------------------- */}
      {error && !isLoading && hasSearched && spans.length === 0 && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-destructive">
            <GitBranch className="h-4 w-4 shrink-0" />
            {error.includes("not found") || error.includes("No spans")
              ? "No spans found for this trace ID"
              : error}
          </CardContent>
        </Card>
      )}

      {/* -- Loading ------------------------------------------------------- */}
      {isLoading && (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <TraceSkeleton />
          </CardContent>
        </Card>
      )}

      {/* -- Timeline + Detail --------------------------------------------- */}
      {spans.length > 0 && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          {/* Timeline */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Trace Timeline
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-accent border-accent/30"
                  >
                    {spans.length} spans
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-muted-foreground"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.max(...spans.map((s) => Number(s.duration_ms || 0)))}ms total
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Column headers */}
              <div className="flex items-center border-b border-border px-4 py-2">
                <span className="w-52 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Span
                </span>
                <span className="flex-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Duration
                </span>
                <span className="w-20 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Offset
                </span>
              </div>

              <ScrollArea className="max-h-[520px]">
                {spans.map((span, i) => {
                  const ts = new Date(span.timestamp).getTime();
                  const offset = ts - minTs;
                  const duration = Number(span.duration_ms || 0);
                  const level = String(span.level || "info");
                  const color = levelColor(level);
                  const widthPct = Math.max(2, (duration / maxDuration) * 100);
                  const isExpanded = expandedSpans.has(span.event_id);
                  const isSelected = selectedSpan?.event_id === span.event_id;

                  return (
                    <div
                      key={span.event_id || i}
                      className={cn(
                        "border-b border-border/20 transition-colors",
                        isSelected
                          ? "bg-primary/[0.06]"
                          : "hover:bg-muted/50",
                        i % 2 === 1 && !isSelected && "bg-muted/[0.02]",
                      )}
                    >
                      <div
                        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
                        onClick={() => setSelectedSpan(span)}
                      >
                        <button
                          className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSpans((prev) => {
                              const next = new Set(prev);
                              if (next.has(span.event_id))
                                next.delete(span.event_id);
                              else next.add(span.event_id);
                              return next;
                            });
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>

                        <div className="w-52 min-w-0">
                          <span className="text-xs font-mono font-medium text-foreground truncate block">
                            {span.event}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {span.service}
                          </span>
                        </div>

                        {/* Waterfall bar */}
                        <div className="flex-1 relative h-5">
                          <div className="absolute inset-0 bg-border/10 rounded" />
                          <div
                            className="absolute top-0.5 bottom-0.5 rounded-sm transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: color,
                              opacity: 0.75,
                            }}
                          />
                        </div>

                        <span className="w-16 text-right text-[11px] font-mono text-muted-foreground">
                          {duration > 0 ? `${duration}ms` : "\u2014"}
                        </span>

                        <span className="w-20 text-right text-[11px] font-mono text-muted-foreground/60">
                          +{offset}ms
                        </span>
                      </div>

                      {/* Expanded inline detail */}
                      {isExpanded && (
                        <div className="px-10 pb-3 space-y-1.5 text-xs border-t border-border/10 mt-1 pt-2">
                          {String(span.error_code || "") && (
                            <div className="flex items-center gap-2 text-destructive">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16">
                                Error
                              </span>
                              {String(span.error_code)}
                            </div>
                          )}
                          {String(span.message || "") && (
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 shrink-0">
                                Message
                              </span>
                              <span className="break-all">
                                {String(span.message)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground/60">
                            <span className="text-[10px] uppercase tracking-wider w-16">
                              ID
                            </span>
                            <span className="font-mono text-[10px]">
                              {span.event_id}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Detail sidebar */}
          <Card className="bg-card border-border h-fit sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                Span Detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSpan ? (
                <div className="space-y-3 text-xs">
                  <DetailRow label="Event" value={selectedSpan.event} mono />
                  <DetailRow label="Service" value={selectedSpan.service} />
                  <div className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
                      Level
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: levelColor(selectedSpan.level) + "40",
                        color: levelColor(selectedSpan.level),
                      }}
                    >
                      {selectedSpan.level}
                    </Badge>
                  </div>
                  <DetailRow
                    label="Outcome"
                    value={String(selectedSpan.outcome || "\u2014")}
                  />
                  <DetailRow
                    label="Duration"
                    value={
                      selectedSpan.duration_ms != null
                        ? `${selectedSpan.duration_ms}ms`
                        : "\u2014"
                    }
                    mono
                  />
                  <DetailRow
                    label="Timestamp"
                    value={selectedSpan.timestamp}
                    mono
                  />
                  <div className="border-t border-border/30 pt-3 space-y-3">
                    <DetailRow
                      label="Trace ID"
                      value={String(selectedSpan.trace_id || "\u2014")}
                      mono
                    />
                    <DetailRow
                      label="Span ID"
                      value={String(selectedSpan.span_id || "\u2014")}
                      mono
                    />
                    <DetailRow
                      label="Event ID"
                      value={selectedSpan.event_id}
                      mono
                    />
                  </div>
                  {selectedSpan.message && (
                    <div className="border-t border-border/30 pt-3">
                      <DetailRow
                        label="Message"
                        value={String(selectedSpan.message)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click a span to view details
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Select any row from the timeline
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* -- Empty State --------------------------------------------------- */}
      {spans.length === 0 && !isLoading && !error && hasSearched && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <GitBranch className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No spans found
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-sm">
            No trace data found for this ID. Verify the trace_id and try again.
          </p>
        </div>
      )}

      {/* -- Initial State ------------------------------------------------- */}
      {spans.length === 0 && !isLoading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <GitBranch className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Search for a trace
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-sm">
            Enter a trace_id above to view the full distributed trace timeline
            with span waterfall visualization
          </p>
        </div>
      )}
    </div>
  );
}
