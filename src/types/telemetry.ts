export interface LozaEvent {
  event_id: string;
  timestamp: string;
  received_at?: string;
  service: string;
  version?: string;
  environment?: string;
  release?: string;
  deployment_id?: string;
  region?: string;
  host?: string;
  event: string;
  kind: "event" | "log" | "metric" | "span";
  level: "debug" | "info" | "notice" | "warn" | "error" | "fatal";
  outcome: string;
  event_state: string;
  message?: string;
  error_code?: string;
  error_type?: string;
  error_message?: string;
  error_stack?: string;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  incident_id?: string;
  method?: string;
  path?: string;
  route?: string;
  status_code?: number;
  http_status?: number;
  sdk_name?: string;
  sdk_version?: string;
  schema_version?: string;
  attrs?: Record<string, unknown>;
  process?: ProcessStep[];
  checkpoints?: Checkpoint[];
}

export interface ProcessStep {
  step: number;
  name: string;
  status: string;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface Checkpoint {
  name: string;
  at_ms: number;
  [key: string]: unknown;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  sql?: string;
  duration_ms?: number;
}

export interface CollectorHealth {
  status: string;
  version: string;
  uptime: string;
  events_ingested: number;
  events_accepted: number;
  events_rejected: number;
  events_dropped: number;
  events_quarantined: number;
  dlq_size: number;
  sinks: SinkHealth[];
}

export interface SinkHealth {
  name: string;
  status: string;
  events_written: number;
  errors: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
  label?: string;
}
