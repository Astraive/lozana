import { describe, it, expect } from "vitest";
import {
  STARTER_PRESETS,
  exportDashboardJson,
  importDashboardJson,
} from "@/lib/storage/dashboard-storage";

describe("Dashboard Storage & Starter Presets", () => {
  it("provides 4 comprehensive starter presets", () => {
    expect(STARTER_PRESETS.length).toBe(4);

    const ids = STARTER_PRESETS.map((p) => p.id);
    expect(ids).toContain("preset-system-overview");
    expect(ids).toContain("preset-http-health");
    expect(ids).toContain("preset-error-intelligence");
    expect(ids).toContain("preset-collector-infra");

    for (const preset of STARTER_PRESETS) {
      expect(preset.title).toBeTruthy();
      expect(preset.panels.length).toBeGreaterThan(0);
      for (const panel of preset.panels) {
        expect(panel.id).toBeTruthy();
        expect(panel.type).toBeTruthy();
        expect(panel.position.w).toBeGreaterThan(0);
        expect(panel.position.h).toBeGreaterThan(0);
      }
    }
  });

  it("exports and imports dashboard JSON correctly", () => {
    const original = STARTER_PRESETS[0];
    const json = exportDashboardJson(original);

    expect(typeof json).toBe("string");
    const imported = importDashboardJson(json);

    expect(imported.title).toBe(original.title);
    expect(imported.description).toBe(original.description);
    expect(imported.panels.length).toBe(original.panels.length);
    expect(imported.variables.length).toBe(original.variables.length);
    expect(imported.isPreset).toBe(false);
  });

  it("throws descriptive error for invalid dashboard JSON", () => {
    expect(() => importDashboardJson("invalid json")).toThrow();
    expect(() => importDashboardJson(JSON.stringify({ notADashboard: true }))).toThrow(
      "missing title or panels array"
    );
  });
});
