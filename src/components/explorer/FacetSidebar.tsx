import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Minus,
  LayoutGrid,
  Pin,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import type { LozaEvent } from "@/types/event";

interface FacetValue {
  value: string;
  count: number;
  percentage: number;
}

interface FacetGroup {
  key: string;
  label: string;
  isAttribute?: boolean;
  values: FacetValue[];
}

interface FacetSidebarProps {
  events: (LozaEvent | Record<string, unknown>)[];
  onAddFilter: (field: string, operator: "=" | "!=", value: string) => void;
  onGroupBy?: (field: string) => void;
  pinnedFacets?: string[];
  onTogglePinFacet?: (facetKey: string) => void;
}

export function FacetSidebar({
  events,
  onAddFilter,
  onGroupBy,
  pinnedFacets = ["service", "level", "environment", "kind", "status_code"],
  onTogglePinFacet,
}: FacetSidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const facetGroups = useMemo(() => {
    if (!events || events.length === 0) return [];

    const counts: Record<string, Record<string, number>> = {};
    const totalEvents = events.length;

    // Standard facet keys to discover
    const targetKeys = [
      "service",
      "level",
      "environment",
      "kind",
      "outcome",
      "status_code",
      "route",
      "method",
      "host",
      "error_type",
    ];

    for (const k of targetKeys) {
      counts[k] = {};
    }

    // Also scan dynamic attrs.*
    for (const evt of events) {
      const record = evt as Record<string, unknown>;
      for (const k of targetKeys) {
        const val = record[k];
        if (val !== undefined && val !== null && val !== "") {
          const strVal = String(val);
          counts[k][strVal] = (counts[k][strVal] || 0) + 1;
        }
      }
      // Check attrs object
      if (evt.attrs && typeof evt.attrs === "object") {
        for (const [attrKey, attrVal] of Object.entries(evt.attrs as Record<string, unknown>)) {
          const fullKey = `attrs.${attrKey}`;
          if (!counts[fullKey]) counts[fullKey] = {};
          if (attrVal !== undefined && attrVal !== null && attrVal !== "") {
            const strVal = String(attrVal);
            counts[fullKey][strVal] = (counts[fullKey][strVal] || 0) + 1;
          }
        }
      }
    }

    const groups: FacetGroup[] = [];

    for (const [key, valMap] of Object.entries(counts)) {
      const entries = Object.entries(valMap);
      if (entries.length === 0) continue;

      // Sort descending by count
      entries.sort((a, b) => b[1] - a[1]);

      const values: FacetValue[] = entries.slice(0, 15).map(([val, count]) => ({
        value: val,
        count,
        percentage: Math.round((count / totalEvents) * 100),
      }));

      groups.push({
        key,
        label: key.startsWith("attrs.") ? key.replace("attrs.", "") : key,
        isAttribute: key.startsWith("attrs."),
        values,
      });
    }

    // Sort: pinned first, then by number of unique values
    return groups.sort((a, b) => {
      const aPinned = pinnedFacets.includes(a.key);
      const bPinned = pinnedFacets.includes(b.key);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.values.length - a.values.length;
    });
  }, [events, pinnedFacets]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return facetGroups;
    const q = search.toLowerCase();
    return facetGroups
      .map((g) => {
        const matchesGroup = g.key.toLowerCase().includes(q) || g.label.toLowerCase().includes(q);
        const matchedValues = g.values.filter((v) => v.value.toLowerCase().includes(q));
        if (matchesGroup || matchedValues.length > 0) {
          return {
            ...g,
            values: matchesGroup ? g.values : matchedValues,
          };
        }
        return null;
      })
      .filter((g): g is FacetGroup => g !== null);
  }, [facetGroups, search]);

  return (
    <div className="w-64 border-r border-border bg-card/60 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Facets & Dimensions</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {events.length} rows
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter fields & values..."
            className="h-7 text-xs pl-7 bg-background"
          />
        </div>
      </div>

      {/* Facets List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground italic">
            No facets discovered from current results.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.key];
            const isPinned = pinnedFacets.includes(group.key);

            return (
              <div key={group.key} className="border border-border/50 rounded-md bg-card overflow-hidden">
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">
                      {group.label}
                    </span>
                    {group.isAttribute && (
                      <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-purple-500/10 text-purple-400">
                        attr
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {onGroupBy && (
                      <button
                        title={`Group by ${group.key}`}
                        onClick={() => onGroupBy(group.key)}
                        className="text-muted-foreground hover:text-primary p-0.5 rounded hover:bg-muted"
                      >
                        <LayoutGrid className="h-3 w-3" />
                      </button>
                    )}
                    {onTogglePinFacet && (
                      <button
                        title={isPinned ? "Unpin facet" : "Pin facet"}
                        onClick={() => onTogglePinFacet(group.key)}
                        className={`p-0.5 rounded hover:bg-muted ${
                          isPinned ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Values List */}
                {!isCollapsed && (
                  <div className="px-2 pb-2 pt-0.5 space-y-1">
                    {group.values.map((val) => (
                      <div
                        key={val.value}
                        className="group flex items-center justify-between text-xs py-0.5 px-1 rounded hover:bg-accent/50 transition-colors relative"
                      >
                        {/* Progress bar background */}
                        <div
                          className="absolute inset-0 bg-primary/10 rounded pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity"
                          style={{ width: `${Math.max(val.percentage, 4)}%` }}
                        />

                        <span className="truncate text-[11px] font-mono z-10 mr-1 max-w-[130px]" title={val.value}>
                          {val.value}
                        </span>

                        <div className="flex items-center gap-1 z-10">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {val.count}
                          </span>

                          {/* Quick Filter Actions */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity ml-1">
                            <button
                              title="Filter include"
                              onClick={() => onAddFilter(group.key, "=", val.value)}
                              className="h-4 w-4 rounded bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground flex items-center justify-center text-[10px]"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                            <button
                              title="Filter exclude"
                              onClick={() => onAddFilter(group.key, "!=", val.value)}
                              className="h-4 w-4 rounded bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground flex items-center justify-center text-[10px]"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
