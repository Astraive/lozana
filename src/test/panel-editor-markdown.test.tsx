import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Render the editor in a DOM-less (node) environment by stubbing dependencies
// that require a browser (Monaco) or pull in unrelated trees (preview renderer).
vi.mock("@monaco-editor/react", () => ({ default: () => null }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/panels/PanelRenderer", () => ({ PanelRenderer: () => null }));
vi.mock("@/stores/app.store", () => ({ useAppStore: () => ({ theme: "dark" }) }));

import { PanelEditorModal } from "@/components/dashboard/PanelEditorModal";
import type { Panel } from "@/types/dashboard";

const markdownPanel: Panel = {
  id: "md-1",
  title: "Runbook",
  description: "Notes",
  type: "markdown",
  query: "from events | limit 100",
  content: "# SRE Runbook\n\nPage the on-call engineer.",
  position: { x: 0, y: 0, w: 6, h: 4 },
};

describe("PanelEditorModal markdown content editing", () => {
  it("renders an editable textarea seeded with the markdown panel body", () => {
    const html = renderToStaticMarkup(
      <PanelEditorModal
        panel={markdownPanel}
        open
        onOpenChange={() => {}}
        onSave={() => {}}
      />
    );

    // The markdown body must be backed by an editable control, not just
    // shown in the (stubbed-out) live preview.
    expect(html).toContain('data-testid="markdown-content-editor"');
    expect(html).toContain("Page the on-call engineer.");
  });
});
