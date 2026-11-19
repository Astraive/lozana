/**
 * Pure, dependency-free helpers shared by dashboard panels.
 *
 * Kept separate from the React components so edge cases (zero values,
 * degenerate ranges, malformed rows, frozen streams) can be unit tested
 * in isolation without pulling in the whole UI dependency tree.
 */

export interface HeatmapData {
  xLabels: string[];
  yLabels: string[];
  values: Map<string, number>;
  maxValue: number;
}

export interface HeatmapPoint {
  x: string;
  y: string;
  value: number;
}

const X_FIELDS = ["x", "time", "timestamp", "bin_timestamp", "time_bucket", "bucket_time"];
const Y_FIELDS = ["y", "bucket", "duration_bucket", "latency_bucket", "series"];
const VALUE_FIELDS = ["value", "count", "count_", "event_count"];

/** First field whose value is neither null nor undefined. Zero is a present value. */
export function firstPresent(row: Record<string, unknown>, fields: string[]): unknown {
  for (const field of fields) {
    if (row[field] !== undefined && row[field] !== null) return row[field];
  }
  return undefined;
}

/** Coerce to a finite number, falling back only for missing/invalid values. Zero is preserved. */
export function finiteOr(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** First named field holding a finite number. Legitimate zero values are kept. */
export function firstFiniteValue(row: Record<string, unknown>, fields: string[]): number | undefined {
  for (const field of fields) {
    const raw = row[field];
    if (raw === undefined || raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Percentage for a half-circle gauge. Degenerate ranges never produce NaN. */
export function computeGaugePercentage(val: number, min: number, max: number): number {
  const range = max - min;
  if (!Number.isFinite(range) || range <= 0 || !Number.isFinite(val)) return 0;
  const clamped = Math.max(min, Math.min(max, val));
  const raw = ((clamped - min) / range) * 100;
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
}

export function isFiniteHeatmapPoint(point: HeatmapPoint | null | undefined): point is HeatmapPoint {
  return Boolean(
    point &&
      typeof point.x === "string" &&
      typeof point.y === "string" &&
      typeof point.value === "number" &&
      Number.isFinite(point.value),
  );
}

/** Empty/degenerate input yields a neutral finite range instead of Infinity/-Infinity. */
export function getHeatmapValueRange(data: HeatmapPoint[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  let found = false;
  for (const point of data) {
    if (!isFiniteHeatmapPoint(point)) continue;
    found = true;
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }
  if (!found) return { min: 0, max: 0 };
  return { min, max };
}

/**
 * Build a heatmap from backend-provided axes/values.
 * Malformed rows are skipped so one bad row cannot blank the whole chart.
 * Duplicate cells are still rejected because rendering them would require
 * aggregation, which is outside this contract.
 */
export function buildHeatmapData(rows: Record<string, unknown>[]): HeatmapData | null {
  const xLabels: string[] = [];
  const yLabels: string[] = [];
  const values = new Map<string, number>();
  let maxValue = 0;

  for (const row of rows) {
    const rawX = firstPresent(row, X_FIELDS);
    const rawY = firstPresent(row, Y_FIELDS);
    const rawValue = firstPresent(row, VALUE_FIELDS);
    if (
      (typeof rawX !== "string" && typeof rawX !== "number") ||
      (typeof rawY !== "string" && typeof rawY !== "number") ||
      (typeof rawValue !== "string" && typeof rawValue !== "number")
    ) {
      continue;
    }

    const x = String(rawX);
    const y = String(rawY);
    const value = Number(rawValue);
    if (!x || !y || !Number.isFinite(value) || value < 0) continue;

    const key = `${y}\u0000${x}`;
    if (values.has(key)) return null;
    values.set(key, value);
    if (!xLabels.includes(x)) xLabels.push(x);
    if (!yLabels.includes(y)) yLabels.push(y);
    maxValue = Math.max(maxValue, value);
  }

  if (values.size === 0) return null;
  return { xLabels, yLabels, values, maxValue };
}

/** Preserve legitimate zero-valued variable options ("0"); drop only nullish values. */
export function toVariableOption(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** Freeze displayed rows while paused so a paused stream stops updating visually. */
export function resolveDisplayRows<T>(liveRows: T[], paused: boolean, frozenRows: T[] | null): T[] {
  return paused && frozenRows !== null ? frozenRows : liveRows;
}
