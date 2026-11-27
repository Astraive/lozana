# Lozana 0.3.1

## Highlights

- Verifies named PostgreSQL and ClickHouse Collector connections in CI.
- Preserves grouped error-type labels in the Overview top-errors chart.
- Keeps selected database connection state nonsecret and Collector-scoped.
- Saves edited panels created from the dashboard page's Add Panel flow.

Lozana remains a private package. Release verification uses `bun install --frozen-lockfile`,
`bun run lint`, `bun run build`, and `bun run test`.
