import { useState } from "react";
import { useDashboardStore } from "@/stores/dashboard.store";
import { PanelRenderer } from "@/components/panels/PanelRenderer";
import { PanelEditorModal } from "./PanelEditorModal";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Sparkles } from "lucide-react";
import type { Dashboard, Panel } from "@/types/dashboard";

interface DashboardGridProps {
  dashboard: Dashboard;
  onEditPanel?: (panel: Panel) => void;
}

export function DashboardGrid({ dashboard, onEditPanel }: DashboardGridProps) {
  const {
    isEditingLayout,
    addPanelToActiveDashboard,
    updatePanelInActiveDashboard,
    removePanelFromActiveDashboard,
    duplicatePanelInActiveDashboard,
  } = useDashboardStore();

  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [editorModalOpen, setEditorModalOpen] = useState(false);

  const handleOpenEdit = (panel: Panel) => {
    setEditingPanel(panel);
    setEditorModalOpen(true);
    if (onEditPanel) onEditPanel(panel);
  };

  const handleSavePanel = (updated: Panel) => {
    updatePanelInActiveDashboard(updated.id, updated);
  };

  const handleAddDefaultPanel = () => {
    const newId = addPanelToActiveDashboard({
      title: "New Time Series",
      type: "timeseries",
      query: "from events | summarize event_count = count() by bin(timestamp, 5m) | sort bin asc",
      position: { x: 0, y: 100, w: 6, h: 4 },
      visualization: { chartType: "area", color: "#3b82f6" },
    });
    const created = dashboard.panels.find((p) => p.id === newId) || {
      id: newId,
      title: "New Time Series",
      type: "timeseries" as const,
      query: "from events | summarize event_count = count() by bin(timestamp, 5m) | sort bin asc",
      position: { x: 0, y: 100, w: 6, h: 4 },
      visualization: { chartType: "area" as const, color: "#3b82f6" },
    };
    handleOpenEdit(created);
  };

  // Helper to map width (1-12) to Tailwind grid col span classes
  const getColSpanClass = (w = 6) => {
    switch (w) {
      case 1:
        return "col-span-12 md:col-span-1";
      case 2:
        return "col-span-12 md:col-span-2";
      case 3:
        return "col-span-12 sm:col-span-6 md:col-span-3";
      case 4:
        return "col-span-12 sm:col-span-6 md:col-span-4";
      case 5:
        return "col-span-12 md:col-span-5";
      case 6:
        return "col-span-12 md:col-span-6";
      case 7:
        return "col-span-12 md:col-span-7";
      case 8:
        return "col-span-12 md:col-span-8";
      case 9:
        return "col-span-12 md:col-span-9";
      case 10:
        return "col-span-12 md:col-span-10";
      case 11:
        return "col-span-12 md:col-span-11";
      case 12:
      default:
        return "col-span-12";
    }
  };

  // Helper to map height (1-12) to min-height classes
  const getHeightClass = (h = 4, type = "timeseries") => {
    if (type === "stat") return "min-h-[140px]";
    if (h <= 3) return "min-h-[180px]";
    if (h <= 4) return "min-h-[260px]";
    if (h <= 6) return "min-h-[360px]";
    return "min-h-[460px]";
  };

  return (
    <div className="space-y-4">
      {dashboard.panels.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl space-y-3 text-center bg-card/40">
          <LayoutGrid className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <h3 className="text-sm font-semibold">No panels in this dashboard</h3>
            <p className="text-xs text-muted-foreground">
              Add your first visualization panel to start monitoring wide events
            </p>
          </div>
          <Button size="sm" onClick={handleAddDefaultPanel} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add First Panel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {dashboard.panels.map((panel) => (
            <div
              key={panel.id}
              className={`${getColSpanClass(panel.position.w)} ${getHeightClass(
                panel.position.h,
                panel.type
              )} flex flex-col`}
            >
              <PanelRenderer
                panel={panel}
                onEdit={handleOpenEdit}
                onDelete={removePanelFromActiveDashboard}
                onDuplicate={duplicatePanelInActiveDashboard}
              />
            </div>
          ))}
        </div>
      )}

      {/* Panel Editor Modal */}
      <PanelEditorModal
        panel={editingPanel}
        open={editorModalOpen}
        onOpenChange={setEditorModalOpen}
        onSave={handleSavePanel}
      />
    </div>
  );
}
