# Lozana 0.3.1

## Highlights

- Verifies named PostgreSQL and ClickHouse Collector connections in CI.
- Keeps selected database connection state nonsecret and Collector-scoped.

Lozana remains a private package. Release verification uses `bun install --frozen-lockfile`,
`bun run lint`, `bun run build`, and `bun run test`.
