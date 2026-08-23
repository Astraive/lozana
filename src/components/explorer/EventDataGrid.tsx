import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch,
  Copy,
  Check,
  Columns,
  ArrowUpDown,
  Split,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { LozaEvent } from "@/types/event";

interface EventDataGridProps {
  events: (LozaEvent | Record<string, unknown>)[];
  columns?: string[];
  onSelectEvent: (event: LozaEvent | Record<string, unknown>) => void;
  onViewTrace?: (traceId: string) => void;
  onFilterByValue?: (field: string, value: string) => void;
  selectedEventId?: string;
  selectedForDiff?: (LozaEvent | Record<string, unknown>)[];
  onToggleDiffSelect?: (event: LozaEvent | Record<string, unknown>) => void;
}

const DEFAULT_VISIBLE_COLUMNS = [
  "timestamp",
  "service",
  "level",
  "event",
  "duration_ms",
  "status_code",
  "route",
  "trace_id",
];

export function EventDataGrid({
  events,
  columns: providedColumns,
  onSelectEvent,
  onViewTrace,
  selectedEventId,
  selectedForDiff = [],
  onToggleDiffSelect,
}: EventDataGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Determine all available columns
  const allColumns = useMemo(() => {
    if (providedColumns && providedColumns.length > 0) {
      return providedColumns;
    }
    const cols = new Set<string>();
    for (const evt of events.slice(0, 100)) {
      for (const k of Object.keys(evt)) {
        cols.add(k);
      }
    }
    return Array.from(cols);
  }, [events, providedColumns]);

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (providedColumns && providedColumns.length > 0) {
      return providedColumns.slice(0, 8);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  // Sort events
  const sortedEvents = useMemo(() => {
    if (!sortColumn) return events;
    return [...events].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortColumn];
      const bVal = (b as Record<string, unknown>)[sortColumn];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [events, sortColumn, sortDirection]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("desc");
    }
  };

  const copyEventJson = (event: LozaEvent | Record<string, unknown>, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = String(event.event_id || Math.random());
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedId(id);
    toast.success("Event JSON copied to clipboard");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderCellContent = (col: string, val: unknown) => {
    if (val === undefined || val === null) {
      return <span className="text-muted-foreground/40 font-mono text-[11px]">—</span>;
    }

    if (col === "level") {
      const level = String(val).toLowerCase();
      let colorClass = "bg-muted text-muted-foreground";
      if (level === "error" || level === "fatal") colorClass = "bg-red-500/15 text-red-400 border-red-500/30";
      else if (level === "warn") colorClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
      else if (level === "info") colorClass = "bg-blue-500/15 text-blue-400 border-blue-500/30";
      else if (level === "debug") colorClass = "bg-purple-500/15 text-purple-400 border-purple-500/30";

      return (
        <Badge variant="outline" className={`font-mono text-[10px] uppercase px-1.5 py-0 ${colorClass}`}>
          {level}
        </Badge>
      );
    }

    if (col === "duration_ms" && typeof val === "number") {
      let colorClass = "text-emerald-400";
      if (val >= 1000) colorClass = "text-red-400 font-semibold";
      else if (val >= 300) colorClass = "text-amber-400";

      return (
        <span className={`font-mono text-xs ${colorClass}`}>
          {val.toFixed(val < 10 ? 2 : 0)}ms
        </span>
      );
    }

    if (col === "status_code" || col === "http_status") {
      const code = Number(val);
      if (isNaN(code) || code === 0) return <span className="text-muted-foreground/40">—</span>;
      let badgeClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      if (code >= 500) badgeClass = "bg-red-500/15 text-red-400 border-red-500/30";
      else if (code >= 400) badgeClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
      else if (code >= 300) badgeClass = "bg-blue-500/15 text-blue-400 border-blue-500/30";

      return (
        <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${badgeClass}`}>
          {code}
        </Badge>
      );
    }

    if (col === "trace_id" && typeof val === "string" && val.trim()) {
      return (
        <div className="flex items-center gap-1">
          <span className="font-mono text-[11px] truncate max-w-[90px]" title={val}>
            {val.substring(0, 10)}…
          </span>
          {onViewTrace && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewTrace(val);
              }}
              title="View Trace Waterfall"
              className="text-primary hover:text-primary-foreground hover:bg-primary p-0.5 rounded transition-colors"
            >
              <GitBranch className="h-3 w-3" />
            </button>
          )}
        </div>
      );
    }

    if (typeof val === "object") {
      return (
        <Badge variant="secondary" className="font-mono text-[10px] bg-muted/60 text-muted-foreground">
          {Array.isArray(val) ? `Array(${val.length})` : "Object"}
        </Badge>
      );
    }

    const str = String(val);
    return (
      <span className="font-mono text-xs truncate max-w-[240px] block" title={str}>
        {str}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card border border-border rounded-lg shadow-sm">
      {/* Table Action Bar */}
      <div className="flex items-center justify-between p-2.5 border-b border-border bg-card/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Data Grid ({events.length} rows)
          </span>
          {selectedForDiff.length > 0 && (
            <Badge variant="secondary" className="text-xs gap-1 bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Split className="h-3 w-3" />
              {selectedForDiff.length} selected for Diff
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Columns className="h-3.5 w-3.5" />
                Columns ({visibleColumns.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allColumns.map((col) => (
                <DropdownMenuItem
                  key={col}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleColumn(col);
                  }}
                  className="text-xs font-mono flex items-center justify-between cursor-pointer"
                >
                  <span>{col}</span>
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col)}
                    onChange={() => {}}
                    className="rounded text-primary h-3.5 w-3.5 pointer-events-none"
                  />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Virtualized Table Container */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <TableRow className="border-b border-border/80 hover:bg-transparent">
              {onToggleDiffSelect && (
                <TableHead className="w-8 px-2 text-center text-xs">#</TableHead>
              )}
              {visibleColumns.map((col) => (
                <TableHead
                  key={col}
                  onClick={() => handleSort(col)}
                  className="cursor-pointer hover:text-foreground transition-colors text-xs font-semibold select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-16 text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEvents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 2}
                  className="text-center py-12 text-xs text-muted-foreground"
                >
                  No events found matching current query.
                </TableCell>
              </TableRow>
            ) : (
              sortedEvents.map((evt, idx) => {
                const eventId = String(evt.event_id || idx);
                const isSelected = selectedEventId === eventId;
                const isDiffSelected = selectedForDiff.some(
                  (d) => String(d.event_id || "") === eventId
                );

                return (
                  <TableRow
                    key={eventId}
                    onClick={() => onSelectEvent(evt)}
                    className={`cursor-pointer transition-colors border-b border-border/40 ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15"
                        : isDiffSelected
                        ? "bg-purple-500/10 hover:bg-purple-500/15"
                        : "hover:bg-accent/40"
                    }`}
                  >
                    {onToggleDiffSelect && (
                      <TableCell className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isDiffSelected}
                          onChange={() => onToggleDiffSelect(evt)}
                          className="rounded text-primary h-3.5 w-3.5 cursor-pointer"
                        />
                      </TableCell>
                    )}

                    {visibleColumns.map((col) => (
                      <TableCell key={col} className="py-2 px-3">
                        {renderCellContent(col, (evt as Record<string, unknown>)[col])}
                      </TableCell>
                    ))}

                    <TableCell className="py-2 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => copyEventJson(evt, e)}
                          title="Copy JSON"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === eventId ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectEvent(evt)}
                          title="Inspect Event"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
