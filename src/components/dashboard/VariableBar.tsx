import { useEffect, useState } from "react";
import { useDashboardStore } from "@/stores/dashboard.store";
import { queryLqlEvents } from "@/lib/api/events";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Filter } from "lucide-react";
import type { DashboardVariable } from "@/types/dashboard";
import { resolveVariableValue } from "@/lib/dashboard/variable-value";
import {
  describeQueryError,
  extractQueryOptions,
  getVariableFallbackOptions,
} from "@/lib/dashboard-variable-options";

interface VariableBarProps {
  variables: DashboardVariable[];
}

export function VariableBar({ variables }: VariableBarProps) {
  const { variableValues, setVariableValue } = useDashboardStore();
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, string[]>>({});
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load options for query-based variables
    for (const v of variables) {
      if (v.type === "query" && v.query) {
        queryLqlEvents(v.query, {}, 50)
          .then((res) => {
            setDynamicOptions((prev) => ({ ...prev, [v.name]: extractQueryOptions(res.rows) }));
            setQueryErrors((prev) => {
              if (!(v.name in prev)) return prev;
              const next = { ...prev };
              delete next[v.name];
              return next;
            });
          })
          .catch((error: unknown) => {
            // Surface the failure and fall back only to this variable's own
            // configured options (or nothing) - never to unrelated fixed values.
            setDynamicOptions((prev) => ({
              ...prev,
              [v.name]: getVariableFallbackOptions(v),
            }));
            setQueryErrors((prev) => ({ ...prev, [v.name]: describeQueryError(error) }));
          });
      }
    }
  }, [variables]);

  if (!variables || variables.length === 0) return null;

  return (
    <div className="flex items-center gap-3 p-2 bg-card/70 border border-border/80 rounded-lg overflow-x-auto flex-wrap shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
        <Filter className="h-3.5 w-3.5 text-primary" />
        <span>Variables:</span>
      </div>

      {variables.map((v) => {
        const currentValue = resolveVariableValue(v, variableValues);
        const options =
          v.type === "query"
            ? dynamicOptions[v.name] || getVariableFallbackOptions(v)
            : v.options || [];
        const queryError = v.type === "query" ? queryErrors[v.name] : undefined;

        return (
          <div key={v.id || v.name} className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground/80">{v.label || v.name}:</span>

            {queryError && (
              <span
                role="alert"
                title={`Failed to load options for "${v.name}": ${queryError}`}
                className="inline-flex items-center gap-1 text-[10px] text-destructive"
              >
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                <span>options unavailable</span>
              </span>
            )}

            {v.type === "textbox" ? (
              <Input
                value={currentValue}
                onChange={(e) => setVariableValue(v.name, e.target.value)}
                placeholder="value..."
                className="h-7 w-28 text-xs font-mono bg-background"
              />
            ) : (
              <select
                value={currentValue}
                onChange={(e) => setVariableValue(v.name, e.target.value)}
                className="h-7 rounded-md bg-background border border-input px-2 text-xs font-mono focus:ring-1 focus:ring-primary"
              >
                {v.includeAll && <option value="all">all</option>}
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
