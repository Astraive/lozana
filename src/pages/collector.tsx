import { useState } from "react";
import { useCollectorHealth } from "@/lib/hooks";
import { LiveTailView } from "@/components/live/LiveTailView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  ArrowDownToLine,
  ShieldCheck,
  ShieldX,
  Trash2,
  Activity,
  Radio,
} from "lucide-react";

export default function CollectorPage() {
  const [activeTab, setActiveTab] = useState<"health" | "livetail">("livetail");
  const health = useCollectorHealth();
  const d = health.data;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Collector & Live Tail</h1>
              {d?.status && (
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-mono ${
                    d.status === "ok"
                      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                      : "text-amber-400 border-amber-500/30"
                  }`}
                >
                  {d.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time NDJSON event streaming console, pipeline throughput, and sink metrics
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md">
          <button
            onClick={() => setActiveTab("livetail")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              activeTab === "livetail" ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Live Tail Stream</span>
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              activeTab === "health" ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Pipeline & Sinks</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "livetail" ? (
        <LiveTailView />
      ) : (
        <div className="space-y-6">
          {/* Health Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-primary" />
                  Events Ingested
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {d?.events_ingested ? d.events_ingested.toLocaleString() : "—"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Accepted
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {d?.events_accepted ? d.events_accepted.toLocaleString() : "—"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ShieldX className="h-3.5 w-3.5 text-amber-400" />
                  Quarantined
                </span>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {d?.events_quarantined ? d.events_quarantined.toLocaleString() : "0"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  DLQ Size
                </span>
                <div className="text-2xl font-bold font-mono text-red-400">
                  {d?.dlq_size ? d.dlq_size.toLocaleString() : "0"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sinks Table */}
          <Card className="bg-card border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Active Storage Sinks
              </CardTitle>
              <CardDescription className="text-xs">
                Backend storage sinks receiving batched wide events (DuckDB, Parquet, Kafka)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {!d?.sinks || d.sinks.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Default DuckDB local sink active.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/70">
                      <TableHead className="text-xs">Sink Name</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Events Written</TableHead>
                      <TableHead className="text-xs text-right">Error Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.sinks.map((sink, idx) => (
                      <TableRow key={idx} className="border-b border-border/40 text-xs">
                        <TableCell className="font-mono font-semibold">{sink.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono capitalize ${
                              sink.status === "healthy" || sink.status === "ok"
                                ? "text-emerald-400 border-emerald-500/30"
                                : "text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {sink.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {sink.events_written.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-400">
                          {sink.errors}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
