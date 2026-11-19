# Lozana — Dashboard and analytics UI for Loza
# Multi-stage: build with bun, serve with nginx

FROM oven/bun:alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS build
WORKDIR /app

# VITE_* values are inlined into the bundle at build time. Pass them with
# `docker build --build-arg VITE_...=...`; they cannot be set at `docker run`.
ARG VITE_LOZANA_API_URL=http://localhost:9308
ARG VITE_LOZANA_WS_URL=ws://localhost:9308
ARG VITE_CORTEX_URL=http://localhost:9312
ENV VITE_LOZANA_API_URL=$VITE_LOZANA_API_URL
ENV VITE_LOZANA_WS_URL=$VITE_LOZANA_WS_URL
ENV VITE_CORTEX_URL=$VITE_CORTEX_URL

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM nginx:alpine@sha256:fed7e14be83cbd2661a75cdc5b872d936cf155d46c327084d30b8df19ae88d72

# Run nginx as non-root
RUN addgroup -g 10001 lozana && \
    adduser -u 10001 -G lozana -s /bin/sh -D lozana

COPY --from=build /app/dist /usr/share/nginx/html

# Serve the SPA with hardened nginx configuration (CSP and other headers).
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf

# Fix permissions for non-root
RUN chown -R lozana:lozana /usr/share/nginx/html && \
    chown -R lozana:lozana /var/cache/nginx && \
    chown -R lozana:lozana /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown lozana:lozana /var/run/nginx.pid

USER lozana

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://localhost:8080/ || exit 1
