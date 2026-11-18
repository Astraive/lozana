import { describe, it, expect } from "vitest";
import { isPanelQueryEnabled } from "@/components/panels/panel-query-enabled";
import type { Panel } from "@/types/dashboard";

const panelSources = import.meta.glob("../components/panels/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function source(pathSuffix: string): string {
  const match = Object.entries(panelSources).find(([path]) => path.endsWith(pathSuffix));
  if (!match) throw new Error(`Missing source: ${pathSuffix}`);
  return match[1];
}

const logPanel: Panel = {
  id: "p1",
  title: "Logs",
  type: "logstream",
  query: "SELECT * FROM logs",
  position: { x: 0, y: 0, w: 12, h: 6 },
};

describe("log stream pause stops the query", () => {
  it("disables the event query while the stream is paused", () => {
    expect(isPanelQueryEnabled(logPanel, false)).toBe(false);
  });

  it("keeps the event query enabled while live tailing", () => {
    expect(isPanelQueryEnabled(logPanel, true)).toBe(true);
  });

  it("still honors panels without a query and markdown panels", () => {
    expect(isPanelQueryEnabled({ ...logPanel, query: "" }, true)).toBe(false);
    expect(isPanelQueryEnabled({ ...logPanel, type: "markdown" }, true)).toBe(false);
  });

  it("threads the paused state into PanelWrapper's enabled prop", () => {
    expect(source("/LogStreamPanel.tsx")).toMatch(/enabled=\{!paused\}/);
  });

  it("forwards enabled into the useQueryEvents call in PanelWrapper", () => {
    const wrapper = source("/PanelWrapper.tsx");
    const queryCall = wrapper.match(/useQueryEvents\([^;]*\)/)?.[0] ?? "";
    expect(queryCall).toContain("enabled");
  });
});
