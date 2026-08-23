import { postJSON } from "./client";
import { ApiError } from "./errors";
import type { QueryResult } from "@/types/event";
import { lqlStringLiteral } from "@/lib/lql/query-contract";

export interface LqlQueryValue {
  type?: string;
  value: unknown;
}

export interface LqlDiagnostic {
  code?: string;
  severity?: string;
  message: string;
  primary_span?: unknown;
  labels?: unknown[];
}

export class LqlQueryError extends Error {
  status: number;
  diagnostics: LqlDiagnostic[];

  constructor(message: string, status: number, diagnostics: LqlDiagnostic[] = []) {
    super(message);
    this.name = "LqlQueryError";
    this.status = status;
    this.diagnostics = diagnostics;
  }
}

function normalizeLimit(value: number, fallback = 100): number {
  return Math.min(Math.max(1, value || fallback), 10_000);
}

function normalizePositive(value: number, fallback: number, max: number): number {
  return Math.min(Math.max(1, value || fallback), max);
}


/** Explicit raw SQL helper for administrative callers. */
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

/** Execute LQL source; this endpoint never accepts client-produced SQL. */
export async function queryLqlEvents(
  query: string,
  parameters: Record<string, LqlQueryValue> = {},
  limit = 1000,
): Promise<QueryResult> {
  try {
    const result = await postJSON<{ columns?: string[]; rows?: Record<string, unknown>[]; duration_ms?: number }>("/lql/query", {
      query,
      parameters,
      limit: normalizeLimit(limit, 1000),
    });
    return {
      columns: result.columns || [],
      rows: result.rows || [],
      duration_ms: result.duration_ms,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      try {
        const body = JSON.parse(error.body) as { error?: string; diagnostics?: LqlDiagnostic[] };
        throw new LqlQueryError(body.error || "LQL compilation failed", error.status, body.diagnostics || []);
      } catch (parseError) {
        if (parseError instanceof LqlQueryError) throw parseError;
      }
    }
    throw error;
  }
}

export async function getTraceEvents(traceId: string): Promise<QueryResult> {
  return queryLqlEvents(`from events | where trace_id = ${lqlStringLiteral(traceId)} | sort timestamp asc | take 500`, {}, 500);
}

export async function getServiceEvents(service: string, limit = 100): Promise<QueryResult> {
  const normalized = normalizeLimit(limit);
  return queryLqlEvents(`from events | where service = ${lqlStringLiteral(service)} | sort timestamp desc | take ${normalized}`, {}, normalized);
}

export async function getErrorEvents(limit = 100): Promise<QueryResult> {
  const normalized = normalizeLimit(limit);
  return queryLqlEvents(`from events | where level = "error" or level = "fatal" | sort timestamp desc | take ${normalized}`, {}, normalized);
}

export async function getEventById(eventId: string): Promise<QueryResult> {
  return queryLqlEvents(`from events | where event_id = ${lqlStringLiteral(eventId)} | take 1`, {}, 1);
}

export async function getRecentEvents(limit = 50): Promise<QueryResult> {
  const normalized = normalizeLimit(limit, 50);
  return queryLqlEvents(`from events | sort timestamp desc | take ${normalized}`, {}, normalized);
}

export async function getEventsOverTime(intervalMinutes = 5, hours = 24): Promise<QueryResult> {
  const interval = normalizePositive(intervalMinutes, 5, 1440);
  const normalizedHours = normalizePositive(hours, 24, 720);
  return queryLqlEvents(
    `from events | where timestamp >= ago(${normalizedHours}h) | summarize event_count = count() by bin(timestamp, ${interval}m) | sort bin asc`,
    {},
    1000,
  );
}

export async function getTopServices(limit = 10): Promise<QueryResult> {
  const normalized = normalizePositive(limit, 10, 100);
  return queryLqlEvents(`from events | summarize event_count = count() by service | sort event_count desc | take ${normalized}`, {}, normalized);
}

export async function getTopErrors(limit = 10): Promise<QueryResult> {
  const normalized = normalizePositive(limit, 10, 100);
  return queryLqlEvents(
    `from events | where level = "error" or level = "fatal" | summarize event_count = count() by error_type | sort event_count desc | take ${normalized}`,
    {},
    normalized,
  );
}

export async function getDistinctServices(): Promise<string[]> {
  try {
    const res = await queryLqlEvents("from events | distinct service | take 100");
    return res.rows.map((r) => String(r.service || r.distinct_service || "")).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getDistinctEnvironments(): Promise<string[]> {
  try {
    const res = await queryLqlEvents("from events | distinct environment | take 50");
    return res.rows.map((r) => String(r.environment || r.distinct_environment || "")).filter(Boolean);
  } catch {
    return [];
  }
}
