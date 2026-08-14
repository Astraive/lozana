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

Environment variables (prefix `VITE_`):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOZANA_API_URL` | Collector API URL | `http://localhost:9308` |
| `VITE_LOZANA_WS_URL` | WebSocket URL | `ws://localhost:9308` |
| `VITE_LOZA_API_KEY` | API key for collector auth | (empty) |

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
