# Lozana Port Map

> All ports are configurable. Values below are canonical defaults.

## Lozana

| Port | Context | Config |
|------|---------|--------|
| 3000 | Dev server (Vite) | `PORT` env var |
| 80 | Production (nginx) | Dockerfile / nginx.conf |
| 8080 | Docker production | Dockerfile EXPOSE |

## Backend Connections

Lozana connects to these Loza backend services:

| Port | Service | Env Var |
|------|---------|---------|
| 9308 | Collector HTTP | `VITE_LOZANA_API_URL` |
| 9308 | Collector WebSocket | `VITE_LOZANA_WS_URL` |
| 9312 | Cortex HTTP | `VITE_CORTEX_URL` |

## Configuration

Lozana is a Vite single-page application: `VITE_` variables are inlined into the JavaScript
bundle **at build time**. They cannot be changed with `docker run -e` or `--env-file`, and must
never hold secrets because the bundle is public.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOZANA_API_URL` | Collector HTTP API URL | `http://localhost:9308` |
| `VITE_LOZANA_WS_URL` | Collector WebSocket URL | `ws://localhost:9308` |
| `VITE_CORTEX_URL` | Cortex HTTP API URL | `http://localhost:9312` |

### .env file (not committed)

For local development, copy `.env.example` to `.env`:

```bash
VITE_LOZANA_API_URL=http://localhost:9308
VITE_LOZANA_WS_URL=ws://localhost:9308
VITE_CORTEX_URL=http://localhost:9312

# Server-only: used by the Vite dev proxy, never exposed to the browser.
LOZA_API_KEY=
```

`VITE_*` variables are inlined into the client bundle. `LOZA_API_KEY` has no `VITE_` prefix, so it stays in the Node process and is attached to proxied collector requests as an `Authorization` header. `VITE_LOZA_API_KEY` is no longer supported; in production, inject the header at the reverse proxy instead of in the SPA.

### Docker

Pass build arguments to bake the endpoints into the image:

```bash
docker build -t lozana \
  --build-arg VITE_LOZANA_API_URL=http://collector:9308 \
  --build-arg VITE_LOZANA_WS_URL=ws://collector:9308 \
  --build-arg VITE_CORTEX_URL=http://cortex:9312 \
  .
docker run -p 8080:8080 lozana
```

### Runtime overrides (no rebuild)

Endpoints entered in the Settings page are stored in the browser and take precedence over the
baked-in defaults, so a deployed container can be reconfigured without a rebuild:

```bash
docker run -p 8080:8080 ghcr.io/astraive/lozana:latest
# Open http://localhost:8080/settings and set the URLs / API key.
```

The API key is never read from the environment; it is held only in `sessionStorage`.

Run `bun run check:env` to verify that these documented variables match the ones used by the code.

## Deprecated Ports

| Old | New | Reason |
|-----|-----|--------|
| 8080 | 9312 | Cortex HTTP conflict |
| 8081 | 9308 | Wrong Cortex→Collector URL |
| 9090 | 9308 | Collector HTTP |
| 9091 | 9309 | Collector gRPC |
| 9100 | 9312 | Cortex HTTP |
| 9101 | 9313 | Cortex gRPC |
