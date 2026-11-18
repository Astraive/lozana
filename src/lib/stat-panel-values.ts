/** Column used for the headline stat value; the sparkline must reflect this same column. */
export function resolveStatTargetKey(row: Record<string, unknown>): string {
  const keys = Object.keys(row);
  return (
    keys.find((k) => k.includes("count") || k.includes("p95") || k.includes("avg") || k.includes("val") || k.includes("dcount")) ||
    keys[0]
  );
}

/** Sparkline bar value for a row. 0 is a real value; only missing/invalid data falls back to 1. */
export function sparklineValue(row: Record<string, unknown>, targetKey: string): number {
  const raw = targetKey ? row[targetKey] : Object.values(row)[0];
  const value = Number(raw ?? 1);
  return Number.isFinite(value) ? value : 1;
}
