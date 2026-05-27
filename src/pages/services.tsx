import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTopServices, useTopErrors } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  Server,
  Activity,
  AlertTriangle,
} from "lucide-react";

/* -- Brand Colors (health bar fills) --------------------------------------- */

const BRAND = {
  teal: "#32E0C4",
  coral: "#FF5C7A",
} as const;

/* -- Skeleton -------------------------------------------------------------- */

function ServiceCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 bg-muted/60 rounded animate-pulse" />
          <div className="h-4 w-4 bg-muted/60 rounded animate-pulse" />
        </div>
        <div className="flex gap-6">
          <div className="space-y-1">
            <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
            <div className="h-6 w-20 bg-muted/60 rounded animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
            <div className="h-6 w-12 bg-muted/60 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -- Page ------------------------------------------------------------------ */

export default function ServicesPage() {
  const services = useTopServices(20);
  const errors = useTopErrors(50);

  const serviceRows = services.data?.rows ?? [];
  const errorRows = errors.data?.rows ?? [];

  // Build error count map by service
  const errorByService = new Map<string, number>();
  for (const row of errorRows) {
    const svc = String(row.service || "unknown");
    errorByService.set(svc, (errorByService.get(svc) || 0) + Number(row.count || 0));
  }

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Service directory -- services emitting events to your Loxa collector
          </p>
        </div>
        {serviceRows.length > 0 && (
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              {serviceRows.length} service{serviceRows.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </div>

      {/* -- Grid ---------------------------------------------------------- */}
      {services.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : serviceRows.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Server className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No services detected yet
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Events will appear here once your services start sending data to
              the Loxa collector
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceRows.map((row, i) => {
            const name = String(row.service || "unknown");
            const count = Number(row.count || 0);
            const errCount = errorByService.get(name) || 0;
            const hasErrors = errCount > 0;

            return (
              <Card
                key={i}
                className={cn(
                  "bg-card border-border hover:border-border/60 transition-all group relative overflow-hidden",
                  hasErrors && "border-destructive/20",
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                          hasErrors
                            ? "bg-destructive/10"
                            : "bg-primary/10",
                        )}
                      >
                        <Server
                          className={cn(
                            "h-4 w-4",
                            hasErrors ? "text-destructive" : "text-primary",
                          )}
                        />
                      </div>
                      <span className="text-sm font-medium truncate">
                        {name}
                      </span>
                    </div>
                    {hasErrors && (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                  </div>

                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        Events
                      </p>
                      <p className="text-lg font-bold font-mono">
                        {count.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        Errors
                      </p>
                      <p
                        className={cn(
                          "text-lg font-bold font-mono",
                          hasErrors ? "text-destructive" : "text-muted-foreground/40",
                        )}
                      >
                        {errCount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Health bar */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(5, ((count - errCount) / Math.max(1, count)) * 100))}%`,
                          backgroundColor: hasErrors ? BRAND.coral : BRAND.teal,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {count > 0
                        ? `${(((count - errCount) / count) * 100).toFixed(0)}%`
                        : "\u2014"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* -- Error State --------------------------------------------------- */}
      {services.error && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Failed to load services
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {String(services.error)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
