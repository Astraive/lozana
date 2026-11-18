import { lqlStringLiteral } from "@/lib/lql/query-contract";

export interface ServiceExploreQueryOptions {
  /** Extra, trusted LQL clause appended to the service predicate. */
  extraWhere?: string;
  limit?: number;
}

/**
 * Build the LQL query used by the "Query in Explore" deep links.
 *
 * The service name originates from graph/telemetry data, so it must be quoted
 * as an LQL string literal. Interpolating it raw between `"` characters lets a
 * name containing `"` or `\` break out of the literal and append arbitrary
 * query clauses. `encodeURIComponent` on the final URL does not prevent this.
 */
export function buildServiceExploreQuery(
  service: string,
  { extraWhere = "", limit = 100 }: ServiceExploreQueryOptions = {},
): string {
  const normalizedLimit = Math.min(Math.max(1, Math.trunc(limit) || 100), 10_000);
  return `from events | where service = ${lqlStringLiteral(service)}${extraWhere} | sort timestamp desc | limit ${normalizedLimit}`;
}

/** Build the /explore deep link, URL-encoding the fully assembled query. */
export function buildServiceExploreHref(
  service: string,
  options?: ServiceExploreQueryOptions,
): string {
  return `/explore?q=${encodeURIComponent(buildServiceExploreQuery(service, options))}`;
}
