import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../scripts/check-env-vars.mjs"
);
const repoRoot = resolve(dirname(scriptPath), "..");

const alignedFiles: Record<string, string> = {
  ".env.example": [
    "VITE_LOZANA_API_URL=http://localhost:9308",
    "VITE_LOZANA_WS_URL=ws://localhost:9308",
    "VITE_CORTEX_URL=http://localhost:9312",
  ].join("\n"),
  "README.md": "VITE_LOZANA_API_URL VITE_LOZANA_WS_URL VITE_CORTEX_URL",
  "docs/ports.md": "VITE_LOZANA_API_URL VITE_LOZANA_WS_URL VITE_CORTEX_URL",
  "src/vite-env.d.ts": [
    "interface ImportMetaEnv {",
    "  readonly VITE_LOZANA_API_URL: string;",
    "  readonly VITE_LOZANA_WS_URL: string;",
    "  readonly VITE_CORTEX_URL: string;",
    "}",
  ].join("\n"),
  "src/lib/client.ts": [
    "import.meta.env.VITE_LOZANA_API_URL;",
    "import.meta.env.VITE_LOZANA_WS_URL;",
    "import.meta.env.VITE_CORTEX_URL;",
  ].join("\n"),
  "vite.config.ts": "process.env.VITE_LOZANA_API_URL",
};

type CheckResult = {
  documented: string[];
  declared: string[];
  used: string[];
  problems: string[];
};

const createdDirs: string[] = [];

function fixture(overrides: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "lozana-env-check-"));
  createdDirs.push(dir);
  for (const [file, content] of Object.entries({ ...alignedFiles, ...overrides })) {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return dir;
}

function check(root: string): CheckResult {
  const output = execFileSync(process.execPath, [scriptPath, "--json", root], {
    encoding: "utf8",
  });
  return JSON.parse(output) as CheckResult;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("env var docs/code agreement check", () => {
  it("accepts this repository's configuration", () => {
    expect(check(repoRoot).problems).toEqual([]);
  });

  it("accepts an aligned fixture", () => {
    expect(check(fixture()).problems).toEqual([]);
  });

  it("flags a documented variable that no code reads", () => {
    const root = fixture({
      "README.md": `${alignedFiles["README.md"]} VITE_NEVER_USED_URL`,
    });
    expect(check(root).problems).toContain(
      "documented but never read in code: VITE_NEVER_USED_URL"
    );
  });

  it("flags a variable read by code but not documented", () => {
    const root = fixture({
      "src/lib/client.ts": `${alignedFiles["src/lib/client.ts"]}\nimport.meta.env.VITE_UNDOCUMENTED_URL;`,
    });
    expect(check(root).problems).toContain(
      "read in code but not documented: VITE_UNDOCUMENTED_URL"
    );
  });

  it("flags a type declaration that is not documented", () => {
    const root = fixture({
      "src/vite-env.d.ts": `${alignedFiles["src/vite-env.d.ts"]}\n// VITE_STALE_DECLARATION: string;`,
    });
    expect(check(root).problems).toContain(
      "declared in types but not documented: VITE_STALE_DECLARATION"
    );
  });

  it("flags a secret-bearing variable", () => {
    const root = fixture({
      ".env.example": `${alignedFiles[".env.example"]}\nVITE_LOZA_API_KEY=`,
    });
    expect(check(root).problems.some((problem) => problem.includes("secret-bearing"))).toBe(
      true
    );
  });

  it("flags a duplicate root declaration file", () => {
    const root = fixture({ "vite-env.d.ts": "// duplicate" });
    expect(check(root).problems.some((problem) => problem.includes("duplicate declaration"))).toBe(
      true
    );
  });
});
