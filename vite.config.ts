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
      "/query": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/lql/query": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/status": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/version": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/ready": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/health": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/tail": { target: process.env.VITE_LOXANA_API_URL || "http://localhost:9308", changeOrigin: true },
      "/events": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/sinks": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
      "/schema": process.env.VITE_LOXANA_API_URL || "http://localhost:9308",
    },
  },
});
