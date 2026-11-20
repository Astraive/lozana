import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Panel } from "@/types/dashboard";

const data = vi.hoisted(() => ({ value: 150 }));

// The actual editor and gauge run. Only query I/O, dialog chrome, and unrelated
// panel types are substituted so preview checks do not need a backend or Monaco.
vi.mock("@monaco-editor/react", () => ({ default: () => null }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/stores/app.store", () => ({ useAppStore: () => ({ theme: "dark" }) }));
vi.mock("@/components/panels/PanelWrapper", () => ({
  PanelWrapper: ({ children }: { children: (result: unknown, loading: boolean) => React.ReactNode }) => (
    <div>{children({ rows: [{ value: data.value }] }, false)}</div>
  ),
}));
vi.mock("@/components/panels/PanelRenderer", async () => {
  const { GaugePanel } = await import("@/components/panels/GaugePanel");
  return {
    PanelRenderer: ({ panel }: { panel: Panel }) =>
      panel.type === "gauge" ? <GaugePanel panel={panel} /> : null,
  };
});

import { PanelEditorModal } from "@/components/dashboard/PanelEditorModal";
import { STARTER_PRESETS } from "@/lib/storage/dashboard-storage";

function previewMarkup(panel: Panel, value: number): string {
  data.value = value;
  return renderToStaticMarkup(
    <PanelEditorModal panel={panel} open onOpenChange={() => {}} onSave={() => {}} />
  );
}

const customGauge: Panel = {
  id: "custom-gauge",
  title: "Custom range",
  type: "gauge",
  query: "from events | limit 1",
  position: { x: 0, y: 0, w: 4, h: 3 },
  visualization: {
    gaugeMin: 100,
    gaugeMax: 200,
    color: "#3b82f6",
    thresholds: [{ value: 140, color: "#ef4444" }],
  },
};

describe("panel editor gauge preview fidelity", () => {
  it("renders existing non-default bounds and threshold color, not 0-100 blue", () => {
    const html = previewMarkup(customGauge, 150);
    expect(html).toContain("rotate(0deg)");
    expect(html).toContain("border-color:#ef4444");
    expect(html).toMatch(/>100<\/span>/);
    expect(html).toMatch(/>200<\/span>/);
  });

  it("uses the existing thresholds of the shipped HTTP 5xx gauge", () => {
    const panel = STARTER_PRESETS.find((d) => d.id === "preset-http-health")?.panels.find(
      (p) => p.id === "p-5xx-rate"
    );
    expect(panel).toBeDefined();
    const html = previewMarkup(panel!, 20);
    expect(html).toContain("border-color:#ef4444");
    expect(html).toContain("rotate(-54deg)");
  });

  it("keeps the blue default for gauges without stored visualization settings", () => {
    const html = previewMarkup({ ...customGauge, visualization: undefined }, 50);
    expect(html).toContain("border-color:#3b82f6");
    expect(html).toContain("rotate(0deg)");
  });
});
