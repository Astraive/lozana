import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { IncidentWorkbench } from "@/components/cortex/IncidentWorkbench";
import { MOCK_CORTEX_RECONSTRUCTION } from "./fixtures/events";

function renderWorkbench(onViewTrace?: (traceId: string) => void): string {
  return renderToStaticMarkup(
    createElement(IncidentWorkbench, {
      reconstruction: MOCK_CORTEX_RECONSTRUCTION,
      onViewTrace,
    }),
  );
}

describe("IncidentWorkbench onViewTrace", () => {
  it("exposes a View Trace control wired to the reconstruction trace id", () => {
    const markup = renderWorkbench(vi.fn());

    expect(markup).toContain("View Trace");
    expect(markup).toContain(`data-trace-id="${MOCK_CORTEX_RECONSTRUCTION.incident_id}"`);
  });

  it("does not render the control when onViewTrace is not supplied", () => {
    const markup = renderWorkbench();

    expect(markup).not.toContain("View Trace");
  });
});
