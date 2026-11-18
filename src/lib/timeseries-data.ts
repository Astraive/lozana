/**
 * Value columns a time-series query can emit, in priority order.
 *
 * A query emits one metric type; these are the known column names for the
 * metrics this app charts. Selection is explicit and nullish-aware (never a
 * `||` chain), so a legitimate `event_count: 0` from an empty bin is kept.
 */
const VALUE_FIELDS = [
  "event_count",
  "count_",
  "count",
  "value",
  "p95_duration_ms",
  "p99_duration_ms",
  "duration_ms",
] as const;

const TIMESTAMP_FIELDS = ["bin", "bin_timestamp", "timestamp"] as const;
const SERVICE_FIELDS = ["service", "status_code"] as const;

/**
 * First field whose value is neither `undefined` nor `null`. Unlike `||`, this
 * preserves falsy-but-present values such as `0`, `""` and `false`.
 */
function firstPresent(row: Record<string, unknown>, fields: readonly string[]): unknown {
  for (const field of fields) {
    const candidate = row[field];
    if (candidate !== undefined && candidate !== null) return candidate;
  }
  return undefined;
}

/**
 * Resolve the single numeric metric for a row.
 *
 * When `valueField` is supplied (from a panel's visualization config) it pins
 * one explicit metric, so a query returning several metrics (e.g. counts and
 * latency percentiles) never has its metric types silently mixed. Without it,
 * the first known value column present in the row is used.
 */
export function resolveMetricValue(row: Record<string, unknown>, valueField?: string): number {
  const raw = valueField ? row[valueField] : firstPresent(row, VALUE_FIELDS);
  if (raw === undefined || raw === null) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  service: string;
}

/** Map query rows into the normalized shape consumed by TimeSeriesChart. */
export function buildTimeSeriesData(
  rows: Record<string, unknown>[],
  valueField?: string,
): TimeSeriesPoint[] {
  return rows.map((row) => ({
    timestamp: String(firstPresent(row, TIMESTAMP_FIELDS) ?? ""),
    value: resolveMetricValue(row, valueField),
    service: String(firstPresent(row, SERVICE_FIELDS) ?? "series"),
  }));
}
