import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTraceEvents, useQueryEvents } from "@/lib/hooks";
import { buildTraceTree, type TraceSpan } from "@/lib/traces/trace-builder";
import { TraceWaterfall } from "@/components/traces/TraceWaterfall";
import { SpanDetailPanel } from "@/components/traces/SpanDetailPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  GitBranch,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export default function TracesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlTraceId = searchParams.get("trace_id") || "";
  const [searchInput, setSearchInput] = useState(urlTraceId);
  const [activeTraceId, setActiveTraceId] = useState(urlTraceId);
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // TanStack query for trace events
  const traceQuery = useTraceEvents(activeTraceId);

  // Fetch recent active traces for quick suggestions
  const recentTracesQuery = useQueryEvents(
    'from events | where trace_id != "" | summarize event_count = count(), max_duration_ms = max(duration_ms) by trace_id, service | sort max_duration_ms desc | take 6',
    {},
    6,
    !activeTraceId
  );

  useEffect(() => {
    if (urlTraceId && urlTraceId !== activeTraceId) {
      setActiveTraceId(urlTraceId);
      setSearchInput(urlTraceId);
    }
  }, [urlTraceId, activeTraceId]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) return;
    setActiveTraceId(clean);
    setSearchParams({ trace_id: clean });
  };

  const handleSelectTraceSuggestion = (id: string) => {
    setSearchInput(id);
    setActiveTraceId(id);
    setSearchParams({ trace_id: id });
  };

  const events = traceQuery.data?.rows ?? [];
  const traceTree = buildTraceTree(events);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-3 pb-2">
      {/* Header & Search Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Trace & Waterfall Explorer</h1>
            <p className="text-xs text-muted-foreground">
              Intra-span micro-Gantt timelines, critical execution paths, and checkpoint milestones
            </p>
          </div>
        </div>

        {/* Trace ID Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Trace ID (e.g. tr_8f9a2e...)"
              className="pl-8 text-xs h-8 font-mono"
            />
          </div>
          <Button type="submit" size="sm" className="h-8 text-xs gap-1.5" disabled={traceQuery.isLoading}>
            {traceQuery.isLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Lookup Trace
          </Button>
        </form>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        {!activeTraceId ? (
          /* Empty Search State with Quick Suggestions */
          <div className="h-full flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto text-center p-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <GitBranch className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold">Inspect Distributed Traces</h2>
              <p className="text-xs text-muted-foreground">
                Enter a <code>trace_id</code> above to reconstruct the entire parent-child span hierarchy and visualize checkpoint milestones on the micro-Gantt waterfall.
              </p>
            </div>

            {/* Suggestions */}
            {recentTracesQuery.data?.rows && recentTracesQuery.data.rows.length > 0 && (
              <div className="w-full space-y-2 text-left pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Recent Active Traces
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recentTracesQuery.data.rows.map((r, i) => {
                    const tid = String(r.trace_id || "");
                    const svc = String(r.service || "service");
                    const dur = Number(r.max_duration_ms || 0);

                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectTraceSuggestion(tid)}
                        className="p-2.5 rounded-lg border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors space-y-1 group"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold text-primary truncate max-w-[130px]">{tid.substring(0, 14)}…</span>
                          <Badge variant="outline" className="text-[10px] text-emerald-400">
                            {dur}ms
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{svc}</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : traceQuery.isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-mono">Reconstructing trace waterfall...</span>
          </div>
        ) : traceQuery.isError ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-destructive p-6">
            <AlertTriangle className="h-10 w-10" />
            <p className="text-sm font-semibold">Failed to fetch trace events</p>
            <p className="text-xs font-mono text-muted-foreground">{traceQuery.error.message}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-center p-6">
            <GitBranch className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold">No spans found for trace ID</h3>
            <code className="text-xs text-muted-foreground font-mono">{activeTraceId}</code>
          </div>
        ) : (
          /* Render Trace Waterfall */
          <TraceWaterfall
            traceTree={traceTree}
            selectedSpanId={selectedSpan?.id}
            onSelectSpan={(span) => {
              setSelectedSpan(span);
              setInspectorOpen(true);
            }}
          />
        )}
      </div>

      {/* Slide-over Span & Lifecycle Inspector */}
      <SpanDetailPanel
        span={selectedSpan}
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        onReconstructCortex={(id) => navigate(`/incidents?incident_id=${encodeURIComponent(id)}`)}
      />
    </div>
  );
}
