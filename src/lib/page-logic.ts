import { LqlQueryError } from "@/lib/api/events";

/**
 * Pure, DOM-free helpers shared by the page components.
 *
 * These live in their own module so the page behaviors called out by
 * LOZ-BUG-003 can be regression-tested without mounting React components.
 */

/** Resolve a query failure into something a page can show in an error banner. */
export interface QueryErrorDisplay {
  title: string;
  messages: string[];
}

/**
 * Only sync a URL-supplied query into the active tab when the URL genuinely
 * changed (initial load or explicit navigation). A tab switch changes the
 * active query but not the URL, so it must never trigger this sync.
 */
export function shouldSyncUrlQuery(
  urlQuery: string,
  lastSyncedUrlQuery: string | null
): boolean {
  return urlQuery.trim().length > 0 && urlQuery !== lastSyncedUrlQuery;
}

/**
 * Turn any query failure into a user-visible banner. LQL failures surface
 * their diagnostics; network/abort/unknown failures get a generic message so a
 * failed query never looks like an empty result.
 */
export function resolveQueryError(error: unknown): QueryErrorDisplay | null {
  if (error == null) return null;

  if (error instanceof LqlQueryError) {
    const diagnostics = error.diagnostics ?? [];
    return {
      title: "LQL Diagnostic Errors",
      messages: diagnostics.length
        ? diagnostics.map((d) => d.message)
        : [error.message || "LQL compilation failed"],
    };
  }

  if (error instanceof Error && error.message) {
    return { title: "Query failed", messages: [error.message] };
  }

  if (typeof error === "string" && error) {
    return { title: "Query failed", messages: [error] };
  }

  return {
    title: "Query failed",
    messages: ["The query could not be executed. Check the connection and retry."],
  };
}

/** Best-effort human-readable message for an unknown async error. */
export function errorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/**
 * A sink is healthy only when it reports ok/healthy AND has no errors, so the
 * Overview and Collector pages agree on a single definition.
 */
export function isSinkHealthy(sink: { status?: string; errors?: number }): boolean {
  const status = (sink.status ?? "").trim().toLowerCase();
  return (status === "ok" || status === "healthy") && (sink.errors ?? 0) === 0;
}

/**
 * Format a health metric for display: zero is a real value, only missing data
 * is shown as a dash.
 */
export function formatHealthMetric(
  value: number | null | undefined,
  fallback = "\u2014"
): string {
  return value == null ? fallback : value.toLocaleString();
}

/** Guard against stale async responses completing out of order. */
export function isLatestRequest(requestId: number, currentRequestId: number): boolean {
  return requestId === currentRequestId;
}
