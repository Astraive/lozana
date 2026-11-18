import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createCollectorProxyConfig } from "./src/server/collector-proxy";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const collectorTarget = env.VITE_LOZANA_API_URL || "http://localhost:9308";
  // Server-only: a non-VITE_ variable is never exposed to the browser.
  const collectorApiKey = env.LOZA_API_KEY || undefined;
  const collectorProxy = () => createCollectorProxyConfig(collectorTarget, collectorApiKey);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": `${import.meta.dirname}/src`,
      },
    },
    server: {
      port: 3000,
      proxy: {
        "/query": collectorProxy(),
        "/lql/query": collectorProxy(),
        "/status": collectorProxy(),
        "/version": collectorProxy(),
        "/ready": collectorProxy(),
        "/health": collectorProxy(),
        "/tail": collectorProxy(),
        "/events": collectorProxy(),
        "/sinks": collectorProxy(),
        "/schema": collectorProxy(),
      },
    },
  };
});
