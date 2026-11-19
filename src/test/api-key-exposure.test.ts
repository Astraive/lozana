import { describe, it, expect } from "vitest";
import { createCollectorProxyConfig } from "../server/collector-proxy";

const configFiles = import.meta.glob(
  [
    "../../vite-env.d.ts",
    "../../src/vite-env.d.ts",
    "../../vite.config.ts",
    "../../.env.example",
    "../../README.md",
    "../../docs/ports.md",
    "../../docs/web-qa-report.md",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const bundledFiles = import.meta.glob("../**/*.{ts,tsx,js,jsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function raw(files: Record<string, string>, pathSuffix: string): string {
  const match = Object.entries(files).find(([path]) => path.endsWith(pathSuffix));
  if (!match) throw new Error(`Missing fixture: ${pathSuffix}`);
  return match[1];
}

/** Files that actually end up in the browser bundle (not Node-only helpers or tests). */
function clientSources(): string[] {
  return Object.entries(bundledFiles)
    .filter(([path]) => !path.includes("/test/") && !path.includes(".test.") && !path.includes("/server/"))
    .map(([, contents]) => contents);
}

type HeaderSink = { setHeader(name: string, value: string): void };

function capturedProxyHeaders(config: ReturnType<typeof createCollectorProxyConfig>): Record<string, string> {
  const headers: Record<string, string> = {};
  const listeners: Array<(proxyReq: HeaderSink) => void> = [];
  const fakeProxy = {
    on(event: string, listener: (proxyReq: HeaderSink) => void) {
      if (event === "proxyReq") listeners.push(listener);
    },
  };

  config.configure?.(fakeProxy as never, {} as never);
  for (const listener of listeners) {
    listener({ setHeader: (name, value) => { headers[name] = value; } });
  }
  return headers;
}

describe("collector API key is never exposed to the client bundle", () => {
  it("does not declare a VITE_-prefixed key in either env declaration", () => {
    const declarations = Object.entries(configFiles).filter(([path]) => path.endsWith("vite-env.d.ts"));
    expect(declarations).toHaveLength(1);
    for (const [, contents] of declarations) {
      expect(contents).not.toContain("VITE_LOZA_API_KEY");
    }
  });

  it("has no VITE_-prefixed key reference in client source", () => {
    for (const contents of clientSources()) {
      expect(contents).not.toContain("VITE_LOZA_API_KEY");
    }
  });

  it("does not advertise a VITE_-prefixed key in configuration docs", () => {
    for (const pathSuffix of ["/.env.example", "/README.md", "/docs/ports.md", "/docs/web-qa-report.md"]) {
      const contents = raw(configFiles, pathSuffix);
      expect(contents).not.toMatch(/VITE_LOZA_API_KEY\s*=/);
      expect(contents).not.toMatch(/\|\s*`?VITE_LOZA_API_KEY`?\s*\|/);
    }
    expect(raw(configFiles, "/.env.example")).toContain("LOZA_API_KEY=");
  });

  it("reads the key from server-side env only", () => {
    const config = raw(configFiles, "/vite.config.ts");
    expect(config).toContain("env.LOZA_API_KEY");
    expect(config).not.toContain("VITE_LOZA_API_KEY");
    expect(config).not.toContain("import.meta.env");
  });

  it("injects the server-only key as an Authorization header on proxied requests", () => {
    const config = createCollectorProxyConfig("http://localhost:9308", "lz_server_secret");
    expect(capturedProxyHeaders(config)).toEqual({ Authorization: "Bearer lz_server_secret" });
  });

  it("does not attach an Authorization header when no server key is configured", () => {
    const config = createCollectorProxyConfig("http://localhost:9308", undefined);
    expect(capturedProxyHeaders(config)).toEqual({});
  });

  it("does not serialize the key into the proxy target or config", () => {
    const config = createCollectorProxyConfig("http://localhost:9308", "lz_server_secret");
    expect(JSON.stringify(config)).not.toContain("lz_server_secret");
  });
});
