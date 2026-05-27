import { postJSON } from "./client";
import type { QueryResult } from "@/types/event";

/** Escape a value for safe use inside a SQL single-quoted string literal. */
function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

export async function queryEvents(sql: string): Promise<QueryResult> {
  const result = await postJSON<{ columns?: string[]; rows?: Record<string, unknown>[]; sql?: string; duration_ms?: number }>("/query", {
    query: sql,
  });
  return {
    columns: result.columns || [],
    rows: result.rows || [],
    sql: result.sql,
    duration_ms: result.duration_ms,
  };
}

export async function getTraceEvents(traceId: string): Promise<QueryResult> {
  return queryEvents(
    `SELECT * FROM events WHERE json_extract_string(raw, '$.trace_id') = '${sqlEscape(traceId)}' ORDER BY json_extract_string(raw, '$.timestamp') ASC LIMIT 500`
  );
}

export async function getServiceEvents(service: string, limit = 100): Promise<QueryResult> {
  return queryEvents(
    `SELECT * FROM events WHERE json_extract_string(raw, '$.service') = '${sqlEscape(service)}' ORDER BY ts DESC LIMIT ${Math.min(limit, 1000)}`
  );
}

export async function getErrorEvents(limit = 100): Promise<QueryResult> {
  return queryEvents(
    `SELECT * FROM events WHERE json_extract_string(raw, '$.level') IN ('error', 'fatal') ORDER BY ts DESC LIMIT ${Math.min(limit, 1000)}`
  );
}

export async function getEventById(eventId: string): Promise<QueryResult> {
  return queryEvents(
    `SELECT * FROM events WHERE json_extract_string(raw, '$.event_id') = '${sqlEscape(eventId)}' LIMIT 1`
  );
}

export async function getRecentEvents(limit = 50): Promise<QueryResult> {
  return queryEvents(`SELECT * FROM events ORDER BY ts DESC LIMIT ${limit}`);
}

export async function getEventsOverTime(intervalMinutes = 5, hours = 24): Promise<QueryResult> {
  return queryEvents(`
    SELECT
      date_trunc('minute', ts) - (extract(minute FROM ts)::int % ${intervalMinutes}) * interval '1 minute' AS time_bucket,
      json_extract_string(raw, '$.level') AS level,
      COUNT(*) AS count
    FROM events
    WHERE ts > NOW() - INTERVAL '${hours} hours'
    GROUP BY time_bucket, level
    ORDER BY time_bucket ASC
  `);
}

export async function getTopServices(limit = 10): Promise<QueryResult> {
  return queryEvents(`
    SELECT json_extract_string(raw, '$.service') AS service, COUNT(*) AS count
    FROM events
    GROUP BY service
    ORDER BY count DESC
    LIMIT ${limit}
  `);
}

export async function getTopErrors(limit = 10): Promise<QueryResult> {
  return queryEvents(`
    SELECT
      json_extract_string(raw, '$.event') AS event_name,
      json_extract_string(raw, '$.error_code') AS error_code,
      COUNT(*) AS count
    FROM events
    WHERE json_extract_string(raw, '$.level') IN ('error', 'fatal')
    GROUP BY event_name, error_code
    ORDER BY count DESC
    LIMIT ${limit}
  `);
}
