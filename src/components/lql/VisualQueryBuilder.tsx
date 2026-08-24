import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LQL_CANONICAL_FIELDS } from "@/lib/lql/monaco-lql";
import {
  buildVisualLql,
  isLqlIdentifier,
  type VisualQueryAggregate,
  type VisualQueryFilter,
} from "@/lib/lql/query-contract";
import {
  Plus,
  Trash2,
  Play,
  Layers,
  Filter,
  BarChart3,
  ArrowUpDown,
  Hash,
  Sparkles,
} from "lucide-react";

export type QueryFilter = VisualQueryFilter;
export type QueryAggregate = VisualQueryAggregate;

interface VisualQueryBuilderProps {
  initialQuery?: string;
  onApply: (query: string) => void;
  onCancel?: () => void;
  availableCustomAttributes?: string[];
}

export function VisualQueryBuilder({
  onApply,
  onCancel,
  availableCustomAttributes = [],
}: VisualQueryBuilderProps) {
  const source = "events";
  const [timePreset, setTimePreset] = useState<string>("1h");
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [isAggregate, setIsAggregate] = useState<boolean>(false);
  const [aggregates, setAggregates] = useState<QueryAggregate[]>([
    { id: "1", fn: "count", field: "" },
  ]);
  const [groupByField, setGroupByField] = useState<string>("service");
  const [timeBucket, setTimeBucket] = useState<string>("5m");
  const [useTimeBucket, setUseTimeBucket] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(100);

  const allFields = Array.from(new Set([...LQL_CANONICAL_FIELDS, ...availableCustomAttributes])).filter(isLqlIdentifier);

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        field: "service",
        operator: "=",
        value: "",
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<QueryFilter>) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const addAggregate = () => {
    setAggregates((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        fn: "p95",
        field: "duration_ms",
      },
    ]);
  };

  const removeAggregate = (id: string) => {
    setAggregates((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAggregate = (id: string, updates: Partial<QueryAggregate>) => {
    setAggregates((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const generatedLql = buildVisualLql({
    source,
    timePreset,
    filters,
    isAggregate,
    aggregates,
    groupByField,
    timeBucket,
    useTimeBucket,
    sortField,
    sortDir,
    limit,
  });

  const handleApply = () => {
    onApply(generatedLql);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Visual Query Builder</h3>
          <Badge variant="outline" className="text-[10px]">GUI Mode</Badge>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleApply} className="gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" />
            Apply & Run LQL
          </Button>
        </div>
      </div>

      {/* Source and Time Window */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Data Source
          </label>
          <select
            value={source}
            disabled
            className="w-full h-8 rounded-md bg-muted/50 border border-input px-2 text-xs"
          >
            <option value="events">events (Canonical wide events)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Time Window</label>
          <select
            value={timePreset}
            onChange={(e) => setTimePreset(e.target.value)}
            className="w-full h-8 rounded-md bg-muted/50 border border-input px-2 text-xs"
          >
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 100)}
            className="w-full h-8 rounded-md bg-muted/50 border border-input px-2 text-xs font-mono"
            min={1}
            max={10000}
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filters ({filters.length})
          </label>
          <Button variant="outline" size="sm" onClick={addFilter} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            Add Filter
          </Button>
        </div>

        {filters.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 italic py-2 bg-muted/20 border border-dashed border-border/60 rounded text-center">
            No custom filters added. (Matching all events in time range)
          </div>
        ) : (
          <div className="space-y-2">
            {filters.map((f) => (
              <div key={f.id} className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border border-border/40">
                <select
                  value={f.field}
                  onChange={(e) => updateFilter(f.id, { field: e.target.value })}
                  className="h-8 rounded bg-background border border-input px-2 text-xs flex-1"
                >
                  {allFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>

                <select
                  value={f.operator}
                  onChange={(e) =>
                    updateFilter(f.id, {
                      operator: e.target.value as QueryFilter["operator"],
                    })
                  }
                  className="h-8 rounded bg-background border border-input px-2 text-xs w-28"
                >
                  <option value="=">equals (=)</option>
                  <option value="!=">not equals (!=)</option>
                  <option value="contains">contains</option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                </select>

                <Input
                  value={f.value}
                  onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                  placeholder="value (e.g. error, 500, checkout)"
                  className="h-8 text-xs flex-1 font-mono"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(f.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode Switch: Raw vs Aggregate */}
      <div className="border-t border-border/50 pt-3 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Query Mode
          </label>
          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setIsAggregate(false)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                !isAggregate ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Raw Event Stream
            </button>
            <button
              type="button"
              onClick={() => setIsAggregate(true)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                isAggregate ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Summarize & Aggregate
            </button>
          </div>
        </div>

        {isAggregate ? (
          <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/60">
            {/* Aggregates List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Aggregations</span>
                <Button variant="outline" size="sm" onClick={addAggregate} className="h-6 text-[11px] gap-1">
                  <Plus className="h-2.5 w-2.5" /> Add Metric
                </Button>
              </div>
              {aggregates.map((agg) => (
                <div key={agg.id} className="flex items-center gap-2">
                  <select
                    value={agg.fn}
                    onChange={(e) =>
                      updateAggregate(agg.id, {
                        fn: e.target.value as QueryAggregate["fn"],
                      })
                    }
                    className="h-7 rounded bg-background border border-input px-2 text-xs w-32"
                  >
                    <option value="count">count()</option>
                    <option value="p95">p95()</option>
                    <option value="p99">p99()</option>
                    <option value="p50">p50()</option>
                    <option value="avg">avg()</option>
                    <option value="sum">sum()</option>
                    <option value="min">min()</option>
                    <option value="max">max()</option>
                    <option value="dcount">dcount()</option>
                  </select>

                  {agg.fn !== "count" && (
                    <select
                      value={agg.field || "duration_ms"}
                      onChange={(e) => updateAggregate(agg.id, { field: e.target.value })}
                      className="h-7 rounded bg-background border border-input px-2 text-xs flex-1"
                    >
                      <option value="duration_ms">duration_ms</option>
                      <option value="status_code">status_code</option>
                      {allFields
                        .filter((f) => f.includes("duration") || f.includes("ms") || f.includes("count") || f.includes("bytes") || f.includes("size"))
                        .map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                    </select>
                  )}

                  {aggregates.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAggregate(agg.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Group By Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/40">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Group By Field</label>
                <select
                  value={groupByField}
                  onChange={(e) => setGroupByField(e.target.value)}
                  className="w-full h-7 rounded bg-background border border-input px-2 text-xs"
                >
                  <option value="">(None)</option>
                  <option value="service">service</option>
                  <option value="level">level</option>
                  <option value="kind">kind</option>
                  <option value="outcome">outcome</option>
                  <option value="environment">environment</option>
                  <option value="status_code">status_code</option>
                  <option value="route">route</option>
                  <option value="error.type">error.type</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Time Bucket</label>
                  <input
                    type="checkbox"
                    checked={useTimeBucket}
                    onChange={(e) => setUseTimeBucket(e.target.checked)}
                    id="useTimeBucket"
                    className="rounded text-primary"
                  />
                </div>
                <select
                  value={timeBucket}
                  onChange={(e) => setTimeBucket(e.target.value)}
                  disabled={!useTimeBucket}
                  className="w-full h-7 rounded bg-background border border-input px-2 text-xs disabled:opacity-50"
                >
                  <option value="1m">1 minute</option>
                  <option value="5m">5 minutes</option>
                  <option value="15m">15 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="1d">1 day</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Raw Sort Controls */
          <div className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/60">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="h-7 rounded bg-background border border-input px-2 text-xs"
            >
              <option value="timestamp">timestamp</option>
              <option value="duration_ms">duration_ms</option>
              <option value="level">level</option>
              <option value="service">service</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
              className="h-7 rounded bg-background border border-input px-2 text-xs"
            >
              <option value="desc">desc (Newest / Highest first)</option>
              <option value="asc">asc (Oldest / Lowest first)</option>
            </select>
          </div>
        )}
      </div>

      {/* Live Generated LQL Preview */}
      <div className="bg-background/80 rounded border border-border p-2.5 text-xs font-mono text-muted-foreground">
        <span className="text-[10px] uppercase font-semibold text-primary block mb-1">Generated LQL:</span>
        <code className="text-foreground">{generatedLql}</code>
      </div>
    </div>
  );
}
