import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/query": "http://localhost:9090",
      "/lql/query": "http://localhost:9090",
      "/status": "http://localhost:9090",
      "/version": "http://localhost:9090",
      "/ready": "http://localhost:9090",
      "/health": "http://localhost:9090",
      "/tail": { target: "http://localhost:9090", changeOrigin: true },
      "/events": "http://localhost:9090",
      "/sinks": "http://localhost:9090",
      "/schema": "http://localhost:9090",
    },
  },
});
