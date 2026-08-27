# Lozana 0.3.0

## Highlights

- Adds Collector-managed database connection summaries and protected connectivity tests.
- Persists only the selected database connection name; credentials remain session/server-side.
- Adds historical LQL query selection for DuckDB, PostgreSQL, and ClickHouse Collector targets.

Lozana remains a private package. Release verification uses `bun install --frozen-lockfile`,
`bun run lint`, `bun run build`, and `bun run test`.
