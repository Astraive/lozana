import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BellOff,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  Server,
  Activity,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -- Brand Colors ---------------------------------------------------------- */

const BRAND = {
  teal: "#32E0C4",
  cyan: "#00D9F5",
  coral: "#FF5C7A",
  gold: "#F6C85F",
} as const;

/* -- Preset Alerts --------------------------------------------------------- */

const PRESET_ALERTS = [
  {
    name: "High Error Rate",
    description: "Detects when error event volume exceeds normal thresholds",
    query:
      'from events | where level = "error" | summarize count()',
    threshold: "> 100/min",
    severity: "critical" as const,
    icon: Shield,
  },
  {
    name: "Payment Failures",
    description: "Monitors checkout payment failure events",
    query:
      'from events | where event = "checkout_payment_failed" | summarize count()',
    threshold: "> 50/10min",
    severity: "critical" as const,
    icon: Zap,
  },
  {
    name: "Slow Requests",
    description: "Flags requests exceeding 5 second response time",
    query:
      "from events | where duration_ms > 5000 | summarize count()",
    threshold: "> 10/min",
    severity: "warning" as const,
    icon: Clock,
  },
  {
    name: "Collector Drops",
    description: "Alerts when events are being dropped by the pipeline",
    query:
      'from events | where outcome = "dropped" | summarize count()',
    threshold: "> 0",
    severity: "critical" as const,
    icon: Activity,
  },
];

/* -- Page ------------------------------------------------------------------ */

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Alert rules and anomaly detection (coming soon)
        </p>
      </div>

      {/* -- Coming Soon Banner -------------------------------------------- */}
      <Card className="bg-card border-[#F6C85F]/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#F6C85F]/10 flex items-center justify-center shrink-0">
              <BellOff className="h-6 w-6 text-[#F6C85F]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-[#F6C85F] mb-1">
                Alert engine not connected
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect to Loxa Cortex to enable real-time alert evaluation,
                notification routing, and alert history. The alert engine
                evaluates LQL queries on a schedule and triggers notifications
                when thresholds are breached.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-[#F6C85F]/30 text-[#F6C85F] hover:bg-[#F6C85F]/10"
                  disabled
                >
                  <Server className="h-3.5 w-3.5 mr-1.5" />
                  Connect Cortex
                </Button>
                <span className="text-xs text-muted-foreground/60">
                  Coming in a future release
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -- Suggested Rules ----------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Suggested Alert Rules
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pre-built rules for common observability patterns
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
            {PRESET_ALERTS.length} rules
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_ALERTS.map((alert) => {
            const Icon = alert.icon;
            const isCritical = alert.severity === "critical";

            return (
              <Card
                key={alert.name}
                className="bg-card border-border hover:border-border/60 transition-all group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-md flex items-center justify-center",
                          isCritical
                            ? "bg-destructive/10"
                            : "bg-[#F6C85F]/10",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4.5 w-4.5",
                            isCritical ? "text-destructive" : "text-[#F6C85F]",
                          )}
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium block">
                          {alert.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {alert.description}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0",
                        isCritical
                          ? "text-destructive border-destructive/30"
                          : "text-[#F6C85F] border-[#F6C85F]/30",
                      )}
                    >
                      {alert.severity}
                    </Badge>
                  </div>

                  <div className="bg-background/50 rounded-md border border-border/50 p-2.5 mb-3">
                    <code className="text-xs font-mono text-accent block truncate">
                      {alert.query}
                    </code>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Threshold:</span>
                      <span className="font-mono font-medium text-primary">
                        {alert.threshold}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      disabled
                    >
                      Configure
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
