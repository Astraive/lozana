/**
 * Format a number with locale-aware separators (e.g. 1,234,567).
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

/**
 * Format bytes as a human-readable string (e.g. "1.5 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const idx = Math.min(i, units.length - 1);

  return `${(bytes / Math.pow(k, idx)).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

/**
 * Format a number as a percentage string (e.g. 0.95 -> "95.0%").
 */
export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * Truncate a string to a maximum length, appending "..." if truncated.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}
