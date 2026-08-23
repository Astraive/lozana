import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useErrorEvents } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  BrainCircuit,
  Bug,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { LozaEvent } from "@/types/event";

interface ErrorGroup {
  fingerprint: string;
  error_type: string;
  error_code: string;
  message_pattern: string;
  service: string;
  count: number;
  first_seen: string;
  last_seen: string;
  sample_event: LozaEvent | Record<string, unknown>;
  events: (LozaEvent | Record<string, unknown>)[];
}

const EMPTY_ROWS: Record<string, unknown>[] = [];

export default function ErrorsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedFingerprint, setExpandedFingerprint] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const errorQuery = useErrorEvents(100);
  const rows = errorQuery.data?.rows ?? EMPTY_ROWS;

  // Group errors by fingerprint: error_type + error_code + service
  const errorGroups: ErrorGroup[] = useMemo(() => {
    const map = new Map<string, ErrorGroup>();

    for (const evt of rows) {
      const type = String(evt.error_type || "UnhandledException");
      const code = String(evt.error_code || "ERR_500");
      const service = String(evt.service || "unknown");
      const msg = String(evt.error_message || evt.message || "An unexpected error occurred");
      const timestamp = String(evt.timestamp || new Date().toISOString());

      const fingerprint = `${service}::${type}::${code}`;

      if (!map.has(fingerprint)) {
        map.set(fingerprint, {
          fingerprint,
          error_type: type,
          error_code: code,
          message_pattern: msg,
          service,
          count: 0,
          first_seen: timestamp,
          last_seen: timestamp,
          sample_event: evt,
          events: [],
        });
      }

      const group = map.get(fingerprint)!;
      group.count++;
      group.events.push(evt);
      if (new Date(timestamp) > new Date(group.last_seen)) {
        group.last_seen = timestamp;
      }
      if (new Date(timestamp) < new Date(group.first_seen)) {
        group.first_seen = timestamp;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  const filteredGroups = errorGroups.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.error_type.toLowerCase().includes(q) ||
      g.error_code.toLowerCase().includes(q) ||
      g.service.toLowerCase().includes(q) ||
      g.message_pattern.toLowerCase().includes(q)
    );
  });

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleExpand = (fp: string) => {
    setExpandedFingerprint((prev) => (prev === fp ? null : fp));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
            <Bug className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Error Intelligence & Fingerprinting</h1>
            <p className="text-xs text-muted-foreground">
              Intelligent error grouping, panic diagnostics, and autonomous root-cause triggers
            </p>
          </div>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search error signatures..."
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Error Events
            </span>
            <div className="text-2xl font-bold font-mono text-red-400">{rows.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Distinct Error Signatures
            </span>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {errorGroups.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Failing Services
            </span>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {new Set(errorGroups.map((g) => g.service)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Errors List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Error Groups ({filteredGroups.length})
          </h3>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-card/40">
            No error groups matching search query.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isExpanded = expandedFingerprint === group.fingerprint;
              const sample = group.sample_event;

              return (
                <Card
                  key={group.fingerprint}
                  className="bg-card border-border/80 hover:border-border transition-all overflow-hidden shadow-sm"
                >
                  {/* Group Header Row */}
                  <div
                    onClick={() => toggleExpand(group.fingerprint)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <button className="text-muted-foreground p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="font-mono text-[10px]">
                            {group.error_code}
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {group.service}
                          </Badge>
                          <span className="font-mono text-xs font-bold text-foreground truncate">
                            {group.error_type}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground font-mono truncate max-w-xl">
                          {group.message_pattern}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-red-400">
                          {group.count} events
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Last: {group.last_seen.substring(11, 19)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/incidents?incident_id=${encodeURIComponent(String(sample.incident_id || sample.trace_id || group.fingerprint))}`
                          );
                        }}
                        className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        Cortex RCA
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details: Stack Trace & Sample Events */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-border/50 bg-muted/15 space-y-3">
                      {Boolean(sample.error_stack) && (
                        <div className="space-y-1.5 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Sample Stack Trace
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleCopy(String(sample.error_stack), group.fingerprint, e)}
                              className="h-6 text-xs gap-1"
                            >
                              {copiedKey === group.fingerprint ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              Copy
                            </Button>
                          </div>
                          <pre className="p-3 rounded-lg bg-black/40 text-[11px] font-mono text-red-300 overflow-x-auto border border-border/70 leading-relaxed">
                            {String(sample.error_stack)}
                          </pre>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Fingerprint: <code>{group.fingerprint}</code>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/explore?q=${encodeURIComponent(`from events | where service = "${group.service}" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50`)}`
                            )
                          }
                          className="h-7 text-xs gap-1.5"
                        >
                          Query Events in Explore
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
