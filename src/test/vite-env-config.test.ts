import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UserConfig } from "vite";
import importedConfigFactory from "../../vite.config";

type ConfigFactory = (env: { command: "build" | "serve"; mode: string }) => UserConfig;
type ProxyMap = Record<string, { target?: string }>;

const originalCwd = process.cwd();
const originalTarget = process.env.VITE_LOZANA_API_URL;

let tempDir: string | undefined;

/**
 * Run the real Vite config against a temporary directory containing only the
 * supplied .env file. `process.env` is cleared so the .env value is the sole
 * source of the collector target — exactly the reported failure scenario.
 */
async function proxyTargetsFromDotEnv(dotEnv: string): Promise<ProxyMap> {
  tempDir = mkdtempSync(join(tmpdir(), "loza-vite-env-"));
  writeFileSync(join(tempDir, ".env"), dotEnv);
  process.chdir(tempDir);
  delete process.env.VITE_LOZANA_API_URL;

  const config = (importedConfigFactory as unknown as ConfigFactory)({ command: "serve", mode: "development" });
  return config.server?.proxy as ProxyMap;
}

describe("vite dev proxy target reads .env files", () => {
  afterEach(() => {
    process.chdir(originalCwd);
    if (originalTarget === undefined) delete process.env.VITE_LOZANA_API_URL;
    else process.env.VITE_LOZANA_API_URL = originalTarget;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("uses VITE_LOZANA_API_URL from a .env file instead of silently falling back to localhost", async () => {
    const proxy = await proxyTargetsFromDotEnv("VITE_LOZANA_API_URL=http://collector-from-dotenv:9308\n");
    expect(proxy["/query"]?.target).toBe("http://collector-from-dotenv:9308");
  });

  it("applies the .env target to every collector proxy route", async () => {
    const target = "http://collector-from-dotenv:9308";
    const proxy = await proxyTargetsFromDotEnv(`VITE_LOZANA_API_URL=${target}\n`);
    expect(Object.keys(proxy).length).toBeGreaterThan(0);
    for (const route of Object.keys(proxy)) {
      expect(proxy[route]?.target, `proxy route ${route}`).toBe(target);
    }
  });

  it("builds the target with Vite loadEnv rather than process.env", () => {
    const source = readFileSync(join(import.meta.dirname, "../../vite.config.ts"), "utf-8");
    expect(source).toContain("loadEnv(");
    expect(source).not.toContain("process.env.VITE_LOZANA_API_URL");
  });
});
