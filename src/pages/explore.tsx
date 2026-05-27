import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { compileToDuckDB } from "@/lib/lql/wasm";
import { useQueryEvents } from "@/lib/hooks";
import { useQueryStore } from "@/stores/query.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Play,
  AlertTriangle,
  Terminal,
  Database,
  Copy,
  Check,
  Zap,
} from "lucide-react";

/* -- Skeletons ------------------------------------------------------------- */

function ResultsSkeleton() {
  return (
    <div className="space-y-0">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-2 border-b border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 bg-muted/60 rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-2.5 border-b border-border/30">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="h-3 bg-muted/40 rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* -- Page ------------------------------------------------------------------ */

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const { query, setQuery } = useQueryStore();
  const [executedSql, setExecutedSql] = useState("");
  const [queryEnabled, setQueryEnabled] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const queryResult = useQueryEvents(executedSql, queryEnabled);

  // Auto-execute from URL query params
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery) {
      setQuery(urlQuery);
      try {
        const sql = compileToDuckDB(urlQuery);
        setExecutedSql(sql);
        setQueryEnabled(true);
        setCompileError(null);
      } catch (err) {
        setCompileError(String(err));
      }
    }
  }, [searchParams, setQuery]);

  const handleExecute = useCallback(() => {
    try {
      const sql = compileToDuckDB(query);
      setExecutedSql(sql);
      setQueryEnabled(true);
      setCompileError(null);
    } catch (err) {
      setCompileError(String(err));
      setQueryEnabled(false);
    }
  }, [query]);

  const handleCopySql = useCallback(() => {
    navigator.clipboard.writeText(executedSql).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    });
  }, [executedSql]);

  const rows = queryResult.data?.rows ?? [];
  const columns = queryResult.data?.columns ?? [];

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Query workbench -- write LQL, get answers
        </p>
      </div>

      {/* -- LQL Input ----------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            LQL Query
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='from events | where level = "error" | sort timestamp desc | limit 100'
            className="font-mono text-sm min-h-[88px] bg-background border-border resize-none focus-visible:ring-primary/30"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleExecute();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExecute}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                disabled={queryResult.isLoading}
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                {queryResult.isLoading ? "Running..." : "Run Query"}
              </Button>
              <span className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-mono">Ctrl</kbd>
                <span className="mx-0.5">+</span>
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 text-[10px] font-mono">Enter</kbd>
              </span>
            </div>
            {queryResult.data?.duration_ms != null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span className="font-mono">{queryResult.data.duration_ms}ms</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* -- Compile Error ------------------------------------------------- */}
      {compileError && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-mono">{compileError}</p>
          </CardContent>
        </Card>
      )}

      {/* -- Compiled SQL -------------------------------------------------- */}
      {executedSql && (
        <div className="rounded-lg bg-card border border-border p-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Compiled SQL
            </span>
            <code className="text-xs font-mono text-accent block mt-1 break-all">
              {executedSql}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={handleCopySql}
          >
            {copiedSql ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
      )}

      {/* -- Query Error --------------------------------------------------- */}
      {queryResult.error && (
        <Card className="border-destructive/30 bg-destructive/[0.05]">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{String(queryResult.error)}</p>
          </CardContent>
        </Card>
      )}

      {/* -- Results ------------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              Results
            </CardTitle>
            <div className="flex items-center gap-2">
              {rows.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                  {rows.length} row{rows.length !== 1 ? "s" : ""}
                </Badge>
              )}
              {queryResult.isLoading && (
                <Badge variant="outline" className="text-[10px] animate-pulse border-accent/30 text-accent">
                  Loading
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {queryResult.isLoading && rows.length === 0 ? (
            <ResultsSkeleton />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Terminal className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {queryEnabled ? "No results returned" : "Ready to query"}
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                {queryEnabled
                  ? "Try adjusting your query filters or time range"
                  : "Enter an LQL query above and click Run, or press Ctrl+Enter to execute"}
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {(columns.length > 0 ? columns : Object.keys(rows[0])).map(
                      (col) => (
                        <TableHead
                          key={col}
                          className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider sticky top-0 bg-card"
                        >
                          {col}
                        </TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 500).map((row, i) => (
                    <TableRow
                      key={i}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        i % 2 === 1 && "bg-muted/[0.03]",
                      )}
                    >
                      {(columns.length > 0 ? columns : Object.keys(row)).map(
                        (col) => (
                          <TableCell
                            key={col}
                            className="text-xs font-mono truncate max-w-[300px] py-2"
                          >
                            {row[col] != null ? String(row[col]) : (
                              <span className="text-muted-foreground/40">&mdash;</span>
                            )}
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
