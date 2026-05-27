import { useCollectorHealth, useTopServices, useTopErrors, useEventsOverTime } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3,
  Server,
  Wifi,
  WifiOff,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* -- Brand Colors (recharts fill props) ------------------------------------ */

const BRAND = {
  teal: "#32E0C4",
  cyan: "#00D9F5",
  coral: "#FF5C7A",
  gold: "#F6C85F",
} as const;

/* -- Skeletons ------------------------------------------------------------- */

function StatSkeleton() {
  return (
    <Card className="bg-card border-border relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
        <div className="h-4 w-4 bg-muted/60 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-9 w-20 bg-muted/60 rounded animate-pulse" />
        <div className="h-3 w-16 bg-muted/40 rounded animate-pulse mt-2" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="h-4 w-32 bg-muted/60 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[220px] flex items-end gap-2 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted/40 rounded-t animate-pulse"
              style={{ height: `${25 + Math.random() * 75}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* -- Stat Card ------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  color: keyof typeof BRAND;
  sub?: string;
}) {
  const colorText: Record<string, string> = {
    teal: "text-primary",
    cyan: "text-accent",
    coral: "text-destructive",
    gold: "text-[#F6C85F]",
  };

  return (
    <Card className="bg-card border-border relative overflow-hidden group hover:border-border/60 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </CardTitle>
        <Icon className={cn("h-4 w-4 opacity-70", colorText[color])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
      <div
        className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full opacity-[0.04]"
        style={{ backgroundColor: BRAND[color] }}
      />
    </Card>
  );
}

/* -- Chart Tooltip --------------------------------------------------------- */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          <span className="font-mono" style={{ color: entry.color }}>{entry.value}</span> events
        </p>
      ))}
    </div>
  );
}

/* -- Page ------------------------------------------------------------------ */

export default function OverviewPage() {
  const health = useCollectorHealth();
  const services = useTopServices(8);
  const errors = useTopErrors(8);
  const eventsOverTime = useEventsOverTime(5, 24);

  const totalEvents = health.data?.events_ingested ?? 0;
  const accepted = health.data?.events_accepted ?? 0;
  const rejected = health.data?.events_rejected ?? 0;
  const dlqSize = health.data?.dlq_size ?? 0;
  const isConnected = !!health.data;
  const status = health.data?.status ?? "unknown";

  const errorRate = isConnected
    ? ((rejected / Math.max(1, totalEvents)) * 100).toFixed(1)
    : null;

  const errorChartData = (errors.data?.rows ?? []).map((r) => ({
    name: String(r.event_name || r.error_code || "unknown"),
    count: Number(r.count || 0),
  }));

  const serviceChartData = (services.data?.rows ?? []).map((r) => ({
    name: String(r.service || "unknown"),
    count: Number(r.count || 0),
  }));

  const timelineData = (eventsOverTime.data?.rows ?? []).map((r) => ({
    time: String(r.bucket || r.time || ""),
    count: Number(r.count || 0),
  }));

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Mission control -- system health at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-primary" />
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Connected
              </Badge>
            </>
          ) : health.isLoading ? (
            <div className="h-6 w-20 bg-muted/60 rounded animate-pulse" />
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-destructive" />
              <Badge variant="destructive" className="text-[10px]">
                Disconnected
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* -- Stat Cards ---------------------------------------------------- */}
      {health.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Events Ingested"
            value={totalEvents.toLocaleString()}
            icon={BarChart3}
            color="teal"
            sub={`${accepted.toLocaleString()} accepted`}
          />
          <StatCard
            label="Error Rate"
            value={errorRate != null ? `${errorRate}%` : "\u2014"}
            icon={AlertTriangle}
            color="coral"
            sub={`${rejected.toLocaleString()} rejected`}
          />
          <StatCard
            label="DLQ Size"
            value={dlqSize.toLocaleString()}
            icon={Zap}
            color="gold"
            sub={dlqSize > 0 ? "Items awaiting retry" : "Queue empty"}
          />
          <StatCard
            label="Collector"
            value={health.data?.version || "\u2014"}
            icon={Server}
            color="cyan"
            sub={status === "ok" ? "Healthy" : status}
          />
        </div>
      )}

      {/* -- Event Timeline ------------------------------------------------ */}
      {eventsOverTime.isLoading ? (
        <ChartSkeleton />
      ) : timelineData.length > 0 ? (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Event Volume (24h)
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                5m intervals
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timelineData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border/50"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: BRAND.teal, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={BRAND.teal}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: BRAND.teal, stroke: "#050D10", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* -- Charts -------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {errors.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Top Error Events
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                  {errorChartData.length} types
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {errorChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={errorChartData} barSize={24}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-border/50"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill={BRAND.coral} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px]">
                  <CheckCircle className="h-8 w-8 text-primary opacity-30 mb-2" />
                  <p className="text-sm text-muted-foreground">No errors detected</p>
                  <p className="text-xs text-muted-foreground/60">All systems nominal</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {services.isLoading ? (
          <ChartSkeleton />
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Top Services
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  {serviceChartData.length} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {serviceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={serviceChartData} barSize={24}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-border/50"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="count" fill={BRAND.teal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px]">
                  <Activity className="h-8 w-8 text-muted-foreground opacity-20 mb-2" />
                  <p className="text-sm text-muted-foreground">No services detected yet</p>
                  <p className="text-xs text-muted-foreground/60">Events will appear here once services start sending data</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* -- Sink Health ---------------------------------------------------- */}
      {health.data?.sinks && health.data.sinks.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                Sink Health
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {health.data.sinks.length} sink{health.data.sinks.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {health.data.sinks.map((sink) => {
                const isHealthy = sink.status === "ok" && sink.errors === 0;
                return (
                  <div
                    key={sink.name}
                    className={cn(
                      "rounded-lg border p-4 space-y-2",
                      isHealthy
                        ? "border-primary/20 bg-primary/[0.03]"
                        : "border-destructive/20 bg-destructive/[0.03]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate">{sink.name}</span>
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        isHealthy ? "bg-primary" : "bg-destructive animate-pulse",
                      )} />
                    </div>
                    <div className="text-lg font-bold font-mono">
                      {sink.events_written.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {sink.errors > 0 ? (
                        <span className="text-destructive font-medium">{sink.errors} errors</span>
                      ) : (
                        <span className="text-primary">Healthy</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* -- Error State ---------------------------------------------------- */}
      {health.error && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Cannot connect to collector
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {String(health.error)} &mdash; check your collector URL in Settings
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
