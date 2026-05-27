import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useErrorEvents } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Search,
  ShieldAlert,
  ShieldX,
  Info,
  Bug,
  BarChart3,
} from "lucide-react";

/* -- Level Badge ----------------------------------------------------------- */

function LevelBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; icon: typeof AlertTriangle; label: string }> = {
    fatal: {
      color: "bg-destructive/15 text-destructive border-destructive/30",
      icon: ShieldX,
      label: "FATAL",
    },
    error: {
      color: "bg-destructive/10 text-destructive border-destructive/20",
      icon: ShieldAlert,
      label: "ERROR",
    },
    warn: {
      color: "bg-[#F6C85F]/10 text-[#F6C85F] border-[#F6C85F]/20",
      icon: AlertTriangle,
      label: "WARN",
    },
    info: {
      color: "bg-accent/10 text-accent border-accent/20",
      icon: Info,
      label: "INFO",
    },
  };
  const c = config[level] ?? config.error;
  const Icon = c.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border", c.color)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

/* -- Skeleton -------------------------------------------------------------- */

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-border/20"
        >
          <div className="h-5 w-16 bg-muted/60 rounded animate-pulse" />
          <div className="h-5 w-24 bg-muted/60 rounded animate-pulse" />
          <div className="h-5 w-32 bg-muted/60 rounded animate-pulse" />
          <div className="flex-1 h-5 bg-muted/40 rounded animate-pulse" />
          <div className="h-5 w-36 bg-muted/60 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* -- Page ------------------------------------------------------------------ */

export default function ErrorsPage() {
  const errors = useErrorEvents(100);
  const [searchFilter, setSearchFilter] = useState("");

  const rows = errors.data?.rows ?? [];

  const filteredRows = rows.filter((r) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    const service = String(r.service || "").toLowerCase();
    const event = String(r.event || "").toLowerCase();
    const message = String(r.message || r.error_message || "").toLowerCase();
    return (
      service.includes(term) ||
      event.includes(term) ||
      message.includes(term)
    );
  });

  const errorCount = filteredRows.filter(
    (r) => String(r.level || "") === "error" || String(r.level || "") === "fatal",
  ).length;
  const warnCount = filteredRows.filter(
    (r) => String(r.level || "") === "warn",
  ).length;

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Errors</h1>
          <p className="text-sm text-muted-foreground">
            Error analysis -- recent error and fatal events
          </p>
        </div>
        {filteredRows.length > 0 && (
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono text-destructive border-destructive/30">
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {warnCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono text-[#F6C85F] border-[#F6C85F]/30">
                {warnCount} warn{warnCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* -- Stats Row ----------------------------------------------------- */}
      {!errors.isLoading && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</p>
                <p className="text-lg font-bold font-mono text-destructive">{errorCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-[#F6C85F]/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-[#F6C85F]" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Warnings</p>
                <p className="text-lg font-bold font-mono text-[#F6C85F]">{warnCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-muted/30 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold font-mono">{filteredRows.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* -- Search -------------------------------------------------------- */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter by service, event, or message..."
          className="h-9 text-sm bg-card border-border pl-9 focus-visible:ring-destructive/30"
        />
      </div>

      {/* -- Error Table --------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bug className="h-4 w-4 text-destructive" />
              Error Events
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredRows.length} event{filteredRows.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {errors.isLoading ? (
            <TableSkeleton />
          ) : filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShieldAlert className="h-7 w-7 text-primary opacity-40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {searchFilter ? "No matching errors found" : "No errors detected"}
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                {searchFilter
                  ? "Try adjusting your search filter"
                  : "All systems nominal -- no error or fatal events in the recent window"}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card w-24">
                      Level
                    </TableHead>
                    <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card w-32">
                      Service
                    </TableHead>
                    <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card w-40">
                      Event
                    </TableHead>
                    <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card">
                      Message
                    </TableHead>
                    <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium sticky top-0 bg-card text-right w-40">
                      Timestamp
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, i) => {
                    const level = String(row.level || "error");
                    return (
                      <TableRow
                        key={i}
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          i % 2 === 1 && "bg-muted/[0.03]",
                        )}
                      >
                        <TableCell className="py-2.5">
                          <LevelBadge level={level} />
                        </TableCell>
                        <TableCell className="text-xs py-2.5">
                          <span className="font-mono text-foreground">
                            {String(row.service || "unknown")}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono py-2.5 truncate max-w-[160px]">
                          {String(row.event || "\u2014")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-2.5 truncate max-w-[300px]">
                          {String(
                            row.message || row.error_message || "\u2014",
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground/70 py-2.5">
                          {row.timestamp
                            ? new Date(
                                String(row.timestamp),
                              ).toLocaleString()
                            : "\u2014"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* -- Error State --------------------------------------------------- */}
      {errors.error && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Failed to load error events
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {String(errors.error)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
