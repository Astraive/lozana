export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface DatabaseConnectionSummary {
  name: string;
  backend: "duckdb" | "postgres" | "clickhouse" | string;
  host?: string;
  port?: number;
  path?: string;
  database?: string;
  table?: string;
  enabled: boolean;
  primary: boolean;
  capabilities: string[];
  health: "healthy" | "unhealthy" | "unknown" | string;
  last_test_at?: string;
  last_test_error?: string;
}

export interface DatabaseConnectionTestResult {
  connection: string;
  backend: string;
  healthy: boolean;
  duration_ms: number;
  error?: string;
}

export interface DatabaseQueryResult {
  connection: string;
  backend: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  duration_ms: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
}
