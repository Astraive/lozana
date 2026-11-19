import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function findRoot(): string {
  const fromModule = fileURLToPath(new URL("../../", import.meta.url));
  if (fs.existsSync(path.join(fromModule, "src", "vite-env.d.ts"))) return fromModule;
  return process.cwd();
}

const ROOT = findRoot();
const SRC = path.join(ROOT, "src");

function listSourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

const sourceFiles = listSourceFiles(SRC);

/** Map every possible relative module specifier to the source file it resolves to. */
function buildModuleIndex(files: string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of files) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    const withoutExt = rel.replace(/\.tsx?$/, "");
    index.set(rel, file);
    index.set(withoutExt, file);
    if (path.basename(withoutExt) === "index") {
      const dir = path.dirname(withoutExt);
      if (dir !== ".") index.set(dir, file);
    }
  }
  return index;
}

const moduleIndex = buildModuleIndex(sourceFiles);
const importPattern =
  /(?:import|export)[\s\S]*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\brequire\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s*["']([^"']+)["']/g;

function resolveSpecifier(specifier: string, fromFile: string): string | undefined {
  let candidate: string;
  if (specifier.startsWith("@/")) candidate = specifier.slice(2);
  else if (specifier.startsWith(".")) {
    const fromRel = path.dirname(path.relative(SRC, fromFile));
    candidate = path.normalize(path.join(fromRel, specifier)).split(path.sep).join("/");
  } else return undefined;

  for (const option of [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}/index.ts`,
    `${candidate}/index.tsx`,
  ]) {
    const hit = moduleIndex.get(option);
    if (hit) return hit;
  }
  return undefined;
}

/** Test files, the app entry point and ambient declarations are intentionally root nodes. */
function isEntryPoint(file: string): boolean {
  const rel = path.relative(SRC, file).split(path.sep).join("/");
  return (
    rel === "app/main.tsx" ||
    rel === "vite-env.d.ts" ||
    rel.startsWith("test/") ||
    /\.test\.tsx?$/.test(rel)
  );
}

function importerCounts(files: string[]): Map<string, number> {
  const counts = new Map(files.map((file) => [file, 0]));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    importPattern.lastIndex = 0;
    const targets = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(text)) !== null) {
      const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (!specifier) continue;
      const target = resolveSpecifier(specifier, file);
      if (target && target !== file) targets.add(target);
    }
    for (const target of targets) counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  return counts;
}

describe("codebase quality cleanup", () => {
  it("keeps exactly one ambient env declaration", () => {
    expect(fs.existsSync(path.join(ROOT, "vite-env.d.ts"))).toBe(false);
    expect(fs.existsSync(path.join(SRC, "vite-env.d.ts"))).toBe(true);
  });

  it("keeps exactly one canonical LozaEvent definition", () => {
    const files = sourceFiles.filter((file) =>
      /interface\s+LozaEvent\b/.test(fs.readFileSync(file, "utf8")),
    );
    expect(files.map((file) => path.relative(ROOT, file))).toEqual(["src/types/event.ts"]);
  });

  it("does not reference the unloaded Geist font family", () => {
    const css = fs.readFileSync(path.join(SRC, "styles/globals.css"), "utf8");
    expect(css).not.toMatch(/Geist/i);
  });

  it("has no unreferenced source files", () => {
    const counts = importerCounts(sourceFiles);
    const unreferenced = sourceFiles
      .filter((file) => !isEntryPoint(file) && (counts.get(file) ?? 0) === 0)
      .map((file) => path.relative(ROOT, file));
    expect(unreferenced).toEqual([]);
  });

  it("removed the dead modules from the flat-refactor cleanup", () => {
    const removed = [
      "src/lib/auth/auth.client.ts",
      "src/lib/auth/session.ts",
      "src/lib/api/endpoints.ts",
      "src/lib/dates.ts",
      "src/lib/format.ts",
      "src/lib/env.ts",
      "src/lib/storage.ts",
      "src/config/charts.ts",
      "src/stores/time-range.store.ts",
      "src/lib/lql/wasm.ts",
      "src/types/common.ts",
      "src/types/telemetry.ts",
      "src/components/charts/HeatmapChart.tsx",
      "src/components/charts/loza-bar-chart.tsx",
      "src/components/charts/loza-line-chart.tsx",
      "src/components/common/CopyButton.tsx",
      "src/components/common/JsonViewer.tsx",
      "src/components/common/StatusBadge.tsx",
      "src/components/common/TimeRangePicker.tsx",
      "src/components/data/DataTable.tsx",
      "src/components/data/EmptyState.tsx",
      "src/components/data/ErrorState.tsx",
      "src/components/data/LoadingState.tsx",
      "src/components/dashboard/stat-card.tsx",
      "src/components/ui/scroll-area.tsx",
      "src/components/ui/select.tsx",
      "src/components/ui/separator.tsx",
      "src/components/ui/tooltip.tsx",
    ];
    expect(removed.filter((rel) => fs.existsSync(path.join(ROOT, rel)))).toEqual([]);
  });
});
