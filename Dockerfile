# Lozana — Dashboard and analytics UI for Loza
# Multi-stage: build with bun, serve with nginx

FROM oven/bun:alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM nginx:alpine

# Run nginx as non-root
RUN addgroup -g 10001 lozana && \
    adduser -u 10001 -G lozana -s /bin/sh -D lozana

COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback — route all requests to index.html
RUN printf 'server {\n\
  listen 8080;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
\n\
  location /assets {\n\
    expires 1y;\n\
    add_header Cache-Control "public, immutable";\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

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
