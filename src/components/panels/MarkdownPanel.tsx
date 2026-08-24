import { PanelWrapper } from "./PanelWrapper";
import type { Panel } from "@/types/dashboard";

interface MarkdownPanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
}

export function MarkdownPanel({ panel, onEdit, onDelete, onDuplicate }: MarkdownPanelProps) {
  const content = panel.content || panel.description || "### Dashboard Notes\n\nAdd documentation, runbook links, or triage instructions here.";

  return (
    <PanelWrapper panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate}>
      {() => (
        <div className="flex-1 overflow-y-auto p-2 text-xs space-y-2 leading-relaxed text-foreground/90">
          <div className="prose prose-invert max-w-none text-xs whitespace-pre-wrap font-sans">
            {content}
          </div>
        </div>
      )}
    </PanelWrapper>
  );
}
