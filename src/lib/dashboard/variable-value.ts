import type { DashboardVariable } from "@/types/dashboard";

/**
 * Resolves the effective value shown for a dashboard variable.
 *
 * A stored value is authoritative even when it is an empty string. Textbox
 * variables must be clearable while a `defaultValue` exists, so we use nullish
 * coalescing rather than `||` (which treats `""` as absent and would snap the
 * input back to the default, making an empty value impossible to submit).
 */
export function resolveVariableValue(
  variable: Pick<DashboardVariable, "name" | "defaultValue" | "includeAll">,
  variableValues: Record<string, string>
): string {
  return variableValues[variable.name] ?? variable.defaultValue ?? (variable.includeAll ? "all" : "");
}
