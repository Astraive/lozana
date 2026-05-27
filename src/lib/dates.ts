/**
 * Format a date as a relative time string (e.g. "5m ago", "2h ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Format milliseconds as a human-readable duration (e.g. "1h 23m 45s").
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s";
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000) % 60;
  const hours = Math.floor(ms / 3_600_000);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ") || "0s";
}

/**
 * Parse a time range string like "1h", "6h", "24h", "7d", "30d" into { from, to }.
 */
export function parseTimeRange(str: string): { from: Date; to: Date } {
  const to = new Date();
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);

  if (!match) {
    // Default to 1 hour
    const from = new Date(to.getTime() - 3_600_000);
    return { from, to };
  }

  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };

  const from = new Date(to.getTime() - num * (multipliers[unit] || 3_600_000));
  return { from, to };
}
