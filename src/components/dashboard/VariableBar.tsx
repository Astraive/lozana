import { useEffect, useState } from "react";
import { useDashboardStore } from "@/stores/dashboard.store";
import { queryLqlEvents } from "@/lib/api/events";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";
import type { DashboardVariable } from "@/types/dashboard";

interface VariableBarProps {
  variables: DashboardVariable[];
}

export function VariableBar({ variables }: VariableBarProps) {
  const { variableValues, setVariableValue } = useDashboardStore();
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Load options for query-based variables
    for (const v of variables) {
      if (v.type === "query" && v.query) {
        queryLqlEvents(v.query, {}, 50)
          .then((res) => {
            const opts = res.rows
              .map((r) => String(Object.values(r)[0] || ""))
              .filter(Boolean);
            setDynamicOptions((prev) => ({ ...prev, [v.name]: opts }));
          })
          .catch(() => {
            // Fallback options
            setDynamicOptions((prev) => ({
              ...prev,
              [v.name]: ["auth-service", "payment-api", "frontend", "checkout-worker"],
            }));
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
        const currentValue = variableValues[v.name] || v.defaultValue || (v.includeAll ? "all" : "");
        const options =
          v.type === "query"
            ? dynamicOptions[v.name] || []
            : v.options || [];

        return (
          <div key={v.id || v.name} className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-foreground/80">{v.label || v.name}:</span>

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
