import type { ProxyOptions } from "vite";

type HeaderSink = { setHeader(name: string, value: string): void };

/**
 * Builds a collector proxy whose Authorization header is attached in the Node
 * process. The key is never read from Vite's client-exposed env, so it cannot
 * be inlined into the browser bundle.
 */
export function createCollectorProxyConfig(target: string, apiKey?: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      if (!apiKey) return;
      const events = proxy as unknown as {
        on(event: "proxyReq", listener: (proxyReq: HeaderSink) => void): void;
      };
      events.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
      });
    },
  };
}
