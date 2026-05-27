# Loxana (v0.2.3)

Loxana is the Loxa observability dashboard -- a Vite + React 19 single-page application.

## Tech Stack

- **Build:** Vite
- **Framework:** React 19
- **Routing:** react-router-dom v7
- **UI:** shadcn/ui + Tailwind CSS
- **State:** React Query (TanStack Query)

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

Output is in `dist/`.

## Configuration

Environment variables (prefix `VITE_`):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOXANA_API_URL` | Collector API URL | `http://localhost:9090` |
| `VITE_LOXANA_WS_URL` | WebSocket URL | `ws://localhost:9090` |
| `VITE_LOXA_API_KEY` | API key for collector auth | (empty) |

See `.env.example` for reference.

## Routes

| Path | Description |
|------|-------------|
| `/` | Overview dashboard |
| `/explore` | Event explorer |
| `/traces` | Trace viewer |
| `/errors` | Error browser |
| `/services` | Service map |
| `/dashboards` | Dashboard builder |
| `/queries` | LQL query editor |
| `/alerts` | Alert rules |
| `/collector` | Collector status |
| `/settings` | Configuration |
| `*` | 404 not found |
