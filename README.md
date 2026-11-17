<p align="center">
  <img src="../assets/branding/loza.svg" alt="Loza" width="150" height="150">
  <h1 align="center">Lozana</h1>
  <p align="center">
    <a href="https://github.com/astraive/loza/actions/workflows/lozana-ci.yml"><img src="https://github.com/astraive/loza/actions/workflows/lozana-ci.yml/badge.svg" alt="Lozana CI"></a>
  </p>
  <p align="center">
    <strong>Dashboard and analytics UI for Loza</strong>
  </p>
</p>

---

## Overview

Lozana is a Vite + React 19 single-page application providing real-time observability dashboards for the Loza platform.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build | Vite |
| Framework | React 19 |
| Routing | react-router-dom v7 |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS v4 |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Editor | Monaco Editor |

## Development

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
bun run build
```

Output is in `dist/`.

## Docker

```bash
docker build -t lozana .
docker run -p 80:80 lozana
```

## Configuration

Client variables (prefix `VITE_`). These are embedded in the browser bundle at build time, so never put secrets in them:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOZANA_API_URL` | Collector API URL | `http://localhost:9308` |
| `VITE_LOZANA_WS_URL` | WebSocket URL | `ws://localhost:9308` |

Server-only variables (never exposed to the browser):

| Variable | Description | Default |
|----------|-------------|---------|
| `LOZA_API_KEY` | Collector API key injected by the Vite dev proxy as `Authorization: Bearer …` | (empty) |
| `VITE_CORTEX_URL` | Cortex API URL | `http://localhost:9312` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:9308/ws/tail` |
| `VITE_LOZA_API_KEY` | API key for collector auth | (empty) |
| `VITE_LOZANA_ALLOWED_ORIGINS` | Comma-separated allowlist of non-loopback API origins | (empty) |

The plaintext defaults are for localhost-only development. Non-loopback
endpoints must use `https://` / `wss://` and be either same-origin or listed in
`VITE_LOZANA_ALLOWED_ORIGINS`. Credentials are sent only as bearer headers over
validated HTTP(S) endpoints - never in WebSocket subprotocols.

See `.env.example` for reference.

> Migration: `VITE_LOZA_API_KEY` has been removed. Set `LOZA_API_KEY` for local development instead. In production, do not embed a key in the SPA — configure your reverse proxy or backend to add the `Authorization` header server-side.

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

## Project Structure

```
src/
├── app/              # App shell, routing, providers
├── components/       # Shared UI components
│   └── ui/           # shadcn/ui primitives
├── features/         # Feature modules
│   ├── dashboard/    # Overview dashboard
│   ├── explore/      # Event explorer
│   ├── traces/       # Trace viewer
│   ├── errors/       # Error browser
│   ├── services/     # Service map
│   ├── queries/      # LQL editor
│   ├── alerts/       # Alert rules
│   ├── collector/    # Collector status
│   └── settings/     # Configuration
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
└── styles/           # Global styles and tokens
```

## License

[MIT](../LICENSE)
