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

describe("HeatmapChart dead-code removal (MASS-0878 / issue #79)", () => {
  it("keeps the unused HeatmapChart component out of the source tree", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(srcRoot)) {
      if (/HeatmapChart|HeatmapDataPoint/.test(readFileSync(file, "utf8"))) {
        offenders.push(relative(srcRoot, file));
      }
    }
    expect(
      offenders,
      `dead HeatmapChart/HeatmapDataPoint symbol still declared in: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
