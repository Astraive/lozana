export const LQL_QUERY_CONTRACT_VERSION = "0.4";

export type QueryOperator = "=" | "!=" | "contains" | ">" | "<" | ">=" | "<=";
export type AggregateFunction = "count" | "p50" | "p95" | "p99" | "avg" | "sum" | "min" | "max" | "dcount";

const QUERY_OPERATORS = new Set<QueryOperator>(["=", "!=", "contains", ">", "<", ">=", "<="]);

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

function requireOperator(value: string): QueryOperator {
  if (!QUERY_OPERATORS.has(value as QueryOperator)) throw new Error(`invalid LQL filter operator: ${value}`);
  return value as QueryOperator;
}

// LQL string literals are single-line tokens (see monaco-lql.ts string rule:
// /"([^"\\]|\\.)*"/ — a raw line terminator can break the literal). Escape
// backslashes and quotes, then encode every control character/line terminator
// so no raw newline can terminate the literal and inject further LQL tokens.
const CONTROL_ESCAPES: Record<string, string> = {
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
};

function isControlCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code <= 0x1f || code === 0x7f || char === "\u2028" || char === "\u2029";}

export function lqlStringLiteral(value: string): string {
  let escaped = "";
  for (const char of value) {
    if (char === "\\") escaped += "\\\\";
    else if (char === '"') escaped += '\\"';
    else if (CONTROL_ESCAPES[char]) escaped += CONTROL_ESCAPES[char];
    else if (isControlCharacter(char)) escaped += `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
    else escaped += char;
  }
  return `"${escaped}"`;
}

/**
 * Builds the LQL used by the "Query in Explore" navigation actions.
 *
 * Service names originate from backend data (service graph / error groups), so
 * they must be emitted as a properly escaped LQL string literal. Callers URL-
 * encode the result with `encodeURIComponent`, which only escapes the final
 * URL and does NOT escape `"` or `\` inside the LQL literal itself — a name
 * containing a quote would otherwise break out of the literal and inject LQL.
 */
export function buildServiceExploreQuery(
  service: string,
  options: { additionalFilter?: string; limit?: number } = {},
): string {
  const limit = Math.min(Math.max(1, Math.trunc(options.limit ?? 100)), 10_000);
  const additionalFilter = options.additionalFilter ? ` ${options.additionalFilter}` : "";
  return `from events | where service = ${lqlStringLiteral(service)}${additionalFilter} | sort timestamp desc | limit ${limit}`;
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
    const operator = requireOperator(filter.operator);
    parts.push(operator === "contains"
      ? `where ${field} contains ${lqlStringLiteral(filter.value)}`
      : `where ${field} ${operator} ${lqlValue(filter.value)}`);
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

const AGGREGATE_FUNCTIONS = new Set<AggregateFunction>([
  "count", "p50", "p95", "p99", "avg", "sum", "min", "max", "dcount",
]);

/** Split on a delimiter only at top level (never inside a literal or brackets). */
function splitTopLevel(text: string, delimiter: "|" | ","): string[] {
  const segments: string[] = [];
  let current = "";
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;

  for (const char of text) {
    if (quote) {
      current += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === "(" || char === "[" || char === "{") { depth += 1; current += char; continue; }
    if (char === ")" || char === "]" || char === "}") { depth = Math.max(0, depth - 1); current += char; continue; }
    if (char === delimiter && depth === 0) { segments.push(current); current = ""; continue; }
    current += char;
  }
  segments.push(current);
  return segments;
}

function findTopLevelKeyword(text: string, keyword: string): number {
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(" || char === "[" || char === "{") { depth += 1; continue; }
    if (char === ")" || char === "]" || char === "}") { depth = Math.max(0, depth - 1); continue; }
    if (depth !== 0) continue;
    if (new RegExp(`^${keyword}\\b`, "i").test(text.slice(i))) return i;
  }
  return -1;
}

function splitByKeyword(text: string, keyword: string): string[] {
  const parts: string[] = [];
  let rest = text;
  let index = findTopLevelKeyword(rest, keyword);
  while (index >= 0) {
    parts.push(rest.slice(0, index));
    rest = rest.slice(index + keyword.length);
    index = findTopLevelKeyword(rest, keyword);
  }
  parts.push(rest);
  return parts;
}

/** Reverse of `lqlStringLiteral`: turn a quoted LQL literal back into its value. */
function unquoteLqlLiteral(raw: string): string {
  const value = raw.trim();
  if (value.length < 2 || (value[0] !== '"' && value[0] !== "'") || value[value.length - 1] !== value[0]) {
    return value;
  }
  const body = value.slice(1, -1);
  let result = "";
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char !== "\\" || i === body.length - 1) { result += char; continue; }
    const next = body[i + 1];
    i += 1;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === "u") {
      const hex = body.slice(i + 1, i + 5);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) { result += String.fromCharCode(parseInt(hex, 16)); i += 4; }
      else result += next;
    } else result += next;
  }
  return result;
}

function parseWherePredicates(
  predicates: string,
  state: VisualQueryState,
  nextId: () => string,
): void {
  for (const part of splitByKeyword(predicates, "and")) {
    const text = part.trim();
    if (!text) continue;

    const ago = text.match(/^timestamp\s*>=\s*ago\(\s*(\d+(?:\.\d+)?(?:ms|s|m|h|d|w))\s*\)$/i);
    if (ago) { state.timePreset = ago[1]; continue; }

    const comparison = text.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s*(>=|<=|!=|==|=|>|<|contains)\s*(.+)$/i);
    if (!comparison) continue;
    const operator = (comparison[2] === "==" ? "=" : comparison[2].toLowerCase()) as QueryOperator;
    if (!QUERY_OPERATORS.has(operator)) continue;
    const value = comparison[3].trim();
    // The builder only models one scalar comparison per filter. Skip compound
    // expressions so re-serializing cannot silently corrupt the user's query.
    if (!value || /[()]/.test(value) || /\s+(?:and|or)\s+/i.test(value)) continue;
    if ((value[0] === '"' || value[0] === "'") && value[value.length - 1] !== value[0]) continue;
    state.filters.push({ id: nextId(), field: comparison[1], operator, value: unquoteLqlLiteral(value) });
  }
}

function parseSummarizeClause(
  body: string,
  state: VisualQueryState,
  nextId: () => string,
): void {
  const byIndex = findTopLevelKeyword(body, "by");
  const aggregatePart = byIndex >= 0 ? body.slice(0, byIndex) : body;
  const groupPart = byIndex >= 0 ? body.slice(byIndex + 2) : "";

  const aggregates: VisualQueryAggregate[] = [];
  for (const expression of splitTopLevel(aggregatePart, ",")) {
    const match = expression.trim().match(
      /^(?:([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([^()]*)\s*\)$/,
    );
    if (!match) continue;
    const fn = match[2].toLowerCase() as AggregateFunction;
    if (!AGGREGATE_FUNCTIONS.has(fn)) continue;
    const field = match[3].trim();
    if (fn !== "count" && !isLqlIdentifier(field)) continue;
    aggregates.push({ id: nextId(), fn, field: fn === "count" ? "" : field });
  }
  if (aggregates.length === 0) aggregates.push({ id: "1", fn: "count", field: "" });
  state.aggregates = aggregates;
  state.isAggregate = true;

  state.groupByField = "";
  for (const group of splitTopLevel(groupPart, ",")) {
    const text = group.trim();
    if (!text) continue;
    const bin = text.match(/^bin\s*\(\s*timestamp\s*,\s*(\d+(?:\.\d+)?(?:ms|s|m|h|d|w))\s*\)$/i);
    if (bin) { state.useTimeBucket = true; state.timeBucket = bin[1]; continue; }
    if (!state.groupByField && isLqlIdentifier(text)) state.groupByField = text;
  }
}

/**
 * Rehydrate the visual builder state from an LQL string.
 *
 * The visual builder only models a subset of LQL, so unsupported clauses are
 * ignored. The function is total: malformed input falls back to the builder
 * defaults instead of throwing, so opening the builder can never break a tab.
 */
export function parseVisualLql(query?: string | null): VisualQueryState {
  const state: VisualQueryState = {
    source: "events",
    timePreset: "1h",
    filters: [],
    isAggregate: false,
    aggregates: [{ id: "1", fn: "count", field: "" }],
    groupByField: "service",
    timeBucket: "5m",
    useTimeBucket: false,
    sortField: "timestamp",
    sortDir: "desc",
    limit: 100,
  };
  if (!query || !query.trim()) return state;

  // An explicit query with no `ago(...)` clause has no time window. Using
  // "all" keeps it intact when buildVisualLql re-serializes it on Apply.
  state.timePreset = "all";

  let filterSeq = 0;
  let aggregateSeq = 0;
  for (const clause of splitTopLevel(query, "|")) {
    const text = clause.trim().replace(/^\/\/.*$/gm, "").trim();
    if (!text) continue;

    const from = text.match(/^from\s+([A-Za-z_][A-Za-z0-9_.]*)$/i);
    if (from) { state.source = from[1]; continue; }

    if (/^where\b/i.test(text)) {
      parseWherePredicates(text.slice(5), state, () => String((filterSeq += 1)));
      continue;
    }

    if (/^summarize\b/i.test(text)) {
      parseSummarizeClause(text.slice("summarize".length), state, () => String((aggregateSeq += 1)));
      continue;
    }

    const sort = text.match(/^sort\s+(?:by\s+)?([A-Za-z_][A-Za-z0-9_.]*)(?:\s+(asc|desc))?$/i);
    if (sort) {
      if (!state.isAggregate && isLqlIdentifier(sort[1])) state.sortField = sort[1];
      if (sort[2]) state.sortDir = sort[2].toLowerCase() as "asc" | "desc";
      continue;
    }

    const take = text.match(/^(?:take|limit)\s+(\d+)$/i);
    if (take) state.limit = Math.min(10_000, Math.max(1, Math.trunc(Number(take[1]))));
  }
  return state;
}
