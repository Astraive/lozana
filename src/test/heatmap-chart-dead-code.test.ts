import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = fileURLToPath(new URL("../", import.meta.url));

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("HeatmapChart is a live component (MASS-0878 / issue #79)", () => {
  it("is referenced by at least one non-test source file", () => {
    const component = collectSourceFiles(srcRoot).find((file) =>
      file.endsWith("components/charts/HeatmapChart.tsx")
    );
    expect(component, "HeatmapChart source file is missing").toBeDefined();

    expect(readFileSync(component!, "utf8")).toMatch(/export function HeatmapChart\(/);
  });
});
