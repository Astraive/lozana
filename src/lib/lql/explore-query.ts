import { lqlStringLiteral } from "./query-contract";

/**
 * Build the LQL query used by the "Query Events in Explore" action on the
 * errors page. The service name comes from event data, so it must be emitted
 * as a properly escaped LQL string literal rather than interpolated raw.
 */
export function buildErrorExploreQuery(service: string): string {
  return `from events | where service = ${lqlStringLiteral(service)} and (level = "error" or level = "fatal") | sort timestamp desc | limit 50`;
}
