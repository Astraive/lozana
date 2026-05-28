import { useCollectorHealth } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Database,
  Zap,
  Clock,
  ArrowDownToLine,
  ShieldCheck,
  ShieldX,
  Trash2,
  AlertTriangle,
  Activity,
} from "lucide-react";

/* -- Skeletons ------------------------------------------------------------- */

function StatSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
          <div className="h-4 w-4 bg-muted/60 rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-muted/60 rounded animate-pulse" />
        <div className="h-3 w-16 bg-muted/40 rounded animate-pulse mt-2" />
      </CardContent>
    </Card>
  );
}

/* -- Stat Card ------------------------------------------------------------- */

function PipelineStat({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Database;
  color: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
    destructive: "text-destructive bg-destructive/10",
    muted: "text-[#FFF1F1] bg-[#FFF1F1]/10",
  };

  return (
    <Card className="bg-card border-border hover:border-border/60 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </span>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", colorMap[color])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight">
          {value}
        </div>
        {sub && (
          <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* -- Page ------------------------------------------------------------------ */

export default function CollectorPage() {
  const health = useCollectorHealth();

  const isConnected = !!health.data;
  const status = health.data?.status || "disconnected";
  const version = health.data?.version;
  const uptime = health.data?.uptime;

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collector</h1>
          <p className="text-sm text-muted-foreground">
            Collector health and pipeline status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  {status}
                </span>
              </div>
              {version && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-accent border-accent/30"
                >
                  v{version}
                </Badge>
              )}
              {uptime && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-muted-foreground"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {uptime}
                </Badge>
              )}
            </>
          ) : health.isLoading ? (
            <div className="h-6 w-24 bg-muted/60 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-sm font-medium text-destructive">
                Disconnected
              </span>
            </div>
          )}
        </div>
      </div>

      {/* -- Pipeline Stats ------------------------------------------------ */}
      {health.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PipelineStat
            label="Events Ingested"
            value={health.data?.events_ingested?.toLocaleString() || "\u2014"}
            icon={ArrowDownToLine}
            color="primary"
            sub="Total received by collector"
          />
          <PipelineStat
            label="Accepted"
            value={health.data?.events_accepted?.toLocaleString() || "\u2014"}
            icon={ShieldCheck}
            color="accent"
            sub="Passed validation"
          />
          <PipelineStat
            label="Rejected"
            value={health.data?.events_rejected?.toLocaleString() || "\u2014"}
            icon={ShieldX}
            color="destructive"
            sub="Failed validation"
          />
          <PipelineStat
            label="DLQ Size"
            value={health.data?.dlq_size?.toLocaleString() || "\u2014"}
            icon={Zap}
            color="muted"
            sub={
              (health.data?.dlq_size ?? 0) > 0
                ? "Items awaiting retry"
                : "Dead letter queue"
            }
          />
        </div>
      )}

      {/* -- Dropped Events ------------------------------------------------ */}
      {health.data?.events_dropped != null && health.data.events_dropped > 0 && (
        <Card className="bg-card border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {health.data.events_dropped.toLocaleString()} events dropped
              </p>
              <p className="text-xs text-muted-foreground">
                Events dropped by the pipeline due to backpressure or sink failures
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* -- Sink Health Table --------------------------------------------- */}
      {health.data?.sinks && health.data.sinks.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Sink Health
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {health.data.sinks.length} sink{health.data.sinks.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card">
                    Sink
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card w-24">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card text-right">
                    Events Written
                  </TableHead>
                  <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card text-right w-24">
                    Errors
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.data.sinks.map((sink, i) => {
                  const isHealthy = sink.status === "ok" && sink.errors === 0;
                  return (
                    <TableRow
                      key={sink.name}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        i % 2 === 1 && "bg-muted/[0.03]",
                      )}
                    >
                      <TableCell className="text-xs font-medium py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              isHealthy
                                ? "bg-primary"
                                : "bg-destructive animate-pulse",
                            )}
                          />
                          {sink.name}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono",
                            isHealthy
                              ? "text-primary border-primary/30"
                              : "text-destructive border-destructive/30",
                          )}
                        >
                          {sink.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono py-3">
                        {sink.events_written.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-xs text-right font-mono py-3",
                          sink.errors > 0
                            ? "text-destructive font-medium"
                            : "text-muted-foreground/40",
                        )}
                      >
                        {sink.errors}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* -- Error State --------------------------------------------------- */}
      {health.error && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Cannot connect to collector
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {String(health.error)} &mdash; check your collector URL in
                Settings
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
