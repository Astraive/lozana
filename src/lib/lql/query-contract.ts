export const LQL_QUERY_CONTRACT_VERSION = "0.4";

export type QueryOperator = "=" | "!=" | "contains" | ">" | "<" | ">=" | "<=";
export type AggregateFunction = "count" | "p50" | "p95" | "p99" | "avg" | "sum" | "min" | "max" | "dcount";

export interface VisualQueryFilter {
  id: string;
  field: string;
  operator: QueryOperator;
  value: string;
}

export interface VisualQueryAggregate {
  id: string;
  fn: AggregateFunction;
  field: string;
  alias?: string;
}

export interface VisualQueryState {
  source: string;
  timePreset: string;
  filters: VisualQueryFilter[];
  isAggregate: boolean;
  aggregates: VisualQueryAggregate[];
  groupByField: string;
  timeBucket: string;
  useTimeBucket: boolean;
  sortField: string;
  sortDir: "asc" | "desc";
  limit: number;
}
const RESERVED_ALIAS = new Set([
  "from", "where", "project", "extend", "summarize", "by", "sort", "asc", "desc",
  "take", "limit", "distinct", "count", "sum", "avg", "min", "max", "p50", "p95",
  "p99", "percentile", "dcount", "first", "last", "and", "or", "not", "in",
  "between", "as", "true", "false", "null",
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_.]*$/;
const DURATION = /^\d+(?:ms|s|m|h|d|w)$/;
const NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function isLqlIdentifier(value: string): boolean {
  return IDENTIFIER.test(value);
}

function requireIdentifier(value: string): string {
  if (!isLqlIdentifier(value)) throw new Error(`invalid LQL identifier: ${value}`);
  return value;
}

function requireAlias(value: string): string {
  const alias = requireIdentifier(value);
  if (RESERVED_ALIAS.has(alias.toLowerCase())) throw new Error(`reserved LQL output alias: ${alias}`);
  return alias;
}

export function lqlStringLiteral(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function lqlValue(value: string): string {
  const trimmed = value.trim();
  return NUMBER.test(trimmed) ? trimmed : lqlStringLiteral(value);
}

export function buildVisualLql(state: VisualQueryState): string {
  const parts = [`from ${requireIdentifier(state.source)}`];
  if (state.timePreset && state.timePreset !== "all") {
    if (!DURATION.test(state.timePreset)) throw new Error(`invalid LQL duration: ${state.timePreset}`);
    parts.push(`where timestamp >= ago(${state.timePreset})`);
  }

  for (const filter of state.filters) {
    if (!filter.value) continue;
    const field = requireIdentifier(filter.field);
    parts.push(filter.operator === "contains"
      ? `where ${field} contains ${lqlStringLiteral(filter.value)}`
      : `where ${field} ${filter.operator} ${lqlValue(filter.value)}`);
  }

  if (state.isAggregate) {
    const aliases = new Map<string, number>();
    const aggregateExpressions = state.aggregates.map((aggregate) => {
      const field = aggregate.fn === "count" ? "" : requireIdentifier(aggregate.field || "duration_ms");
      const baseAlias = aggregate.alias
        ? requireAlias(aggregate.alias)
        : aggregate.fn === "count"
        ? "event_count"
        : `${aggregate.fn}_${field.replace(/\./g, "_")}`;
      const occurrence = (aliases.get(baseAlias) ?? 0) + 1;
      aliases.set(baseAlias, occurrence);
      const alias = occurrence === 1 ? baseAlias : `${baseAlias}_${occurrence}`;
      const expression = aggregate.fn === "count" ? "count()" : `${aggregate.fn}(${field})`;
      return { expression: `${alias} = ${expression}`, alias };
    });
    if (aggregateExpressions.length === 0) aggregateExpressions.push({ expression: "event_count = count()", alias: "event_count" });

    const groups: string[] = [];
    if (state.useTimeBucket) {
      if (!DURATION.test(state.timeBucket)) throw new Error(`invalid LQL duration: ${state.timeBucket}`);
      groups.push(`bin(timestamp, ${state.timeBucket})`);
    }
    if (state.groupByField) groups.push(requireIdentifier(state.groupByField));
    parts.push(`summarize ${aggregateExpressions.map(({ expression }) => expression).join(", ")}${groups.length ? ` by ${groups.join(", ")}` : ""}`);
    parts.push(state.useTimeBucket ? "sort bin asc" : `sort ${aggregateExpressions[0].alias} desc`);
  } else if (state.sortField) {
    parts.push(`sort ${requireIdentifier(state.sortField)} ${state.sortDir}`);
  }

  if (state.limit > 0) parts.push(`take ${Math.min(Math.max(1, Math.trunc(state.limit)), 10_000)}`);
  return parts.join(" | ");
}
