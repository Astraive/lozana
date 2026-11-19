import type { DashboardVariable } from "@/types/dashboard";

/** Extract option values from a query result (first column of each row). */
export function extractQueryOptions(rows: Record<string, unknown>[]): string[] {
  return rows
    .map((r) => String(Object.values(r)[0] || ""))
    .filter(Boolean);
}

/**
 * Options to display when a variable's query fails. Only the variable's own
 * configured options are ever used; otherwise the list is empty. We must not
 * fabricate unrelated values (such as hardcoded service names) for an
 * arbitrary query variable like a status code or a region.
 */
export function getVariableFallbackOptions(variable: DashboardVariable): string[] {
  return variable.options ? [...variable.options] : [];
}

/** Human-readable reason for a failed variable query, surfaced in the UI. */
export function describeQueryError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const text = String(error);
  return text && text !== "[object Object]" ? text : "Unknown error";
}

type OptionsQuery = (query: string) => Promise<{ rows: Record<string, unknown>[] }>;

type ApplyVariableOptions = (
  name: string,
  options: string[],
  error: string | undefined
) => void;

/**
 * Starts one option load per query variable for the current effect generation
 * and returns its cleanup. Cleanup marks the generation stale so a late
 * resolution - after `variables` changed or the component unmounted - cannot
 * overwrite the options or errors currently shown.
 */
export function loadVariableOptions(
  variables: DashboardVariable[],
  queryLql: OptionsQuery,
  apply: ApplyVariableOptions
): () => void {
  let cancelled = false;

  for (const v of variables) {
    if (v.type === "query" && v.query) {
      queryLql(v.query)
        .then((res) => {
          if (cancelled) return;
          apply(v.name, extractQueryOptions(res.rows), undefined);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          apply(v.name, getVariableFallbackOptions(v), describeQueryError(error));
        });
    }
  }

  return () => {
    cancelled = true;
  };
}
