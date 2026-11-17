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
docker run -p 8080:8080 lozana
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
### Build-time variables

Vite inlines `VITE_` variables into the bundle when the app is built. They cannot be changed
afterwards, and because the bundle is public they must never contain credentials.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOZANA_API_URL` | Collector HTTP API URL | `http://localhost:9308` |
| `VITE_LOZANA_WS_URL` | Collector WebSocket URL | `ws://localhost:9308` |
| `VITE_CORTEX_URL` | Cortex HTTP API URL | `http://localhost:9312` |

Copy `.env.example` to `.env` for local development, or set the variables in the build
environment. See `.env.example` for reference.

> [!WARNING]
> Never put an API key, token, password, or any other secret in a `VITE_` variable: it would be
> published in the public JavaScript bundle. The collector API key is entered in the Settings
> page at runtime and held only in `sessionStorage`; it is never read from the environment.

### Docker

Pass the build arguments so the values are compiled into the image:

```bash
docker build -t lozana \
  --build-arg VITE_LOZANA_API_URL=http://collector:9308 \
  --build-arg VITE_LOZANA_WS_URL=ws://collector:9308 \
  --build-arg VITE_CORTEX_URL=http://cortex:9312 \
  .
docker run -p 8080:8080 lozana
```

`docker run -e VITE_...` and `--env-file` have no effect on an already-built image: the values
are fixed at build time. To reconfigure a running container without rebuilding, open
`http://localhost:8080/settings` and set the endpoints there — those overrides are persisted in
the browser (`localStorage` for URLs, `sessionStorage` for the API key) and take precedence over
the baked-in defaults.

Run `bun run check:env` to verify that the documented variables match the ones used by the code.

> Migration: `VITE_LOZA_API_KEY` has been removed. Set `LOZA_API_KEY` for local development instead. In production, do not embed a key in the SPA — configure your reverse proxy or backend to add the `Authorization` header server-side.
## Authentication model

Lozana uses API-key authentication. The **collector API token** is entered on the
`/settings` page and kept only for the current browser session (sessionStorage).
It is attached as `Authorization: Bearer <token>` to collector requests, along
with the `X-Loza-Env` / `X-Loza-Collector` tenancy headers. The backend remains
the authority that validates the key; client-side route gating is defense in
depth only.

Every app route except `/settings` requires a configured collector token and
redirects to `/settings` when one is missing. `/settings` stays public so a
token can be entered there.

Cortex is a **separate trust domain** with its own optional API token, also
configured on `/settings`. The collector token and collector tenancy headers are
never forwarded to Cortex: Cortex requests carry only their own credential (if
set), `Content-Type`, and `X-Request-Id`.
## Token storage policy

Bearer tokens (API keys / session tokens) must never be written to `localStorage`,
where any script on the page can read them and they persist after the tab is closed.

- The API key is kept in `sessionStorage` only (`src/stores/app.store.ts`), which is
  scoped to the current tab and cleared when it closes. Any legacy `localStorage`
  copy is removed on load.
- Session data (`src/lib/auth/session.ts`) is likewise stored only in
  `sessionStorage`. `getSession()` fails closed: a session with a missing, malformed,
  or past `expiresAt` is rejected and removed. Tokens are never written to
  `localStorage`.
- Non-secret preferences (URLs, theme, layout) may remain in `localStorage`.

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
