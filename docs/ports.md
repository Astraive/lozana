# Loxana Port Map

> All ports are configurable. Values below are canonical defaults.

## Loxana

| Port | Context | Config |
|------|---------|--------|
| 3000 | Dev server (Vite) | `PORT` env var |
| 80 | Production (nginx) | Dockerfile / nginx.conf |
| 8080 | Docker production | Dockerfile EXPOSE |

## Backend Connections

Loxana connects to these Loxa backend services:

| Port | Service | Env Var |
|------|---------|---------|
| 9308 | Collector HTTP | `VITE_LOXANA_API_URL` |
| 9308 | Collector WebSocket | `VITE_LOXANA_WS_URL` |
| 9312 | Cortex HTTP | `VITE_CORTEX_URL` |

## Configuration

Loxana uses Vite environment variables for configuration. Set via `.env` file or runtime env vars.

### .env file (not committed)

```bash
VITE_LOXANA_API_URL=http://localhost:9308
VITE_LOXANA_WS_URL=ws://localhost:9308
VITE_LOXA_API_KEY=
VITE_CORTEX_URL=http://localhost:9312
```

### Docker

Mount a `.env` file or pass env vars directly:

```bash
# With .env file
docker run -p 3000:8080 \
  --env-file .env \
  ghcr.io/astraive/loxana:latest

# With env vars
docker run -p 3000:8080 \
  -e VITE_LOXANA_API_URL=http://collector:9308 \
  -e VITE_LOXANA_WS_URL=ws://collector:9308 \
  -e VITE_CORTEX_URL=http://cortex:9312 \
  ghcr.io/astraive/loxana:latest
```

### Custom config file

Loxana is a Vite SPA — configuration is embedded at build time via `VITE_*` env vars. For runtime configuration, use the `.env` file approach above.

## Deprecated Ports

| Old | New | Reason |
|-----|-----|--------|
| 8080 | 9312 | Cortex HTTP conflict |
| 8081 | 9308 | Wrong Cortex→Collector URL |
| 9090 | 9308 | Collector HTTP |
| 9091 | 9309 | Collector gRPC |
| 9100 | 9312 | Cortex HTTP |
| 9101 | 9313 | Cortex gRPC |
