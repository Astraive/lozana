import { useState } from "react";
import { useDashboardStore } from "@/stores/dashboard.store";
import { exportDashboardJson, importDashboardJson } from "@/lib/storage/dashboard-storage";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { VariableBar } from "@/components/dashboard/VariableBar";
import { PanelEditorModal } from "@/components/dashboard/PanelEditorModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  Plus,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  RotateCcw,
  Check,
  ChevronDown,
  Layers,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { Dashboard, Panel } from "@/types/dashboard";

export default function DashboardsPage() {
  const {
    dashboards,
    activeDashboardId,
    setActiveDashboardId,
    addDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    resetToPresets,
    addPanelToActiveDashboard,
    isEditingLayout,
    setIsEditingLayout,
    getActiveDashboard,
  } = useDashboardStore();

  const activeDashboard = getActiveDashboard() || dashboards[0];

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [importJson, setImportJson] = useState("");
  const [newPanelOpen, setNewPanelOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);

  const handleCreateDashboard = () => {
    if (!newTitle.trim()) return;
    const newId = addDashboard({
      title: newTitle.trim(),
      description: newDescription.trim(),
      tags: ["custom"],
      variables: [
        {
          id: "var-service",
          name: "service",
          label: "Service",
          type: "query",
          query: "from events | distinct service",
          defaultValue: "all",
          includeAll: true,
        },
      ],
      panels: [],
    });
    setNewTitle("");
    setNewDescription("");
    setCreateOpen(false);
    toast.success("Created new dashboard");
  };

  const handleImportDashboard = () => {
    try {
      const imported = importDashboardJson(importJson);
      const newId = addDashboard(imported);
      setImportJson("");
      setImportOpen(false);
      toast.success(`Imported dashboard: ${imported.title}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid JSON format");
    }
  };

  const handleExportDashboard = () => {
    if (!activeDashboard) return;
    const json = exportDashboardJson(activeDashboard);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${activeDashboard.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dashboard JSON exported");
  };

  const handleAddNewPanel = () => {
    const newId = addPanelToActiveDashboard({
      title: "New Time Series",
      type: "timeseries",
      query: "from events | summarize event_count = count() by bin(timestamp, 5m) | sort bin asc",
      position: { x: 0, y: 100, w: 6, h: 4 },
      visualization: { chartType: "area", color: "#3b82f6" },
    });
    const panel = activeDashboard.panels.find((p) => p.id === newId) || {
      id: newId,
      title: "New Time Series",
      type: "timeseries" as const,
      query: "from events | summarize event_count = count() by bin(timestamp, 5m) | sort bin asc",
      position: { x: 0, y: 100, w: 6, h: 4 },
      visualization: { chartType: "area" as const, color: "#3b82f6" },
    };
    setEditingPanel(panel);
    setNewPanelOpen(true);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Header & Dashboard Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <LayoutGrid className="h-4 w-4" />
          </div>

          {/* Active Dashboard Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-sm font-semibold">
                <span className="truncate max-w-[200px]">{activeDashboard?.title || "Dashboards"}</span>
                {activeDashboard?.isPreset && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary/10 text-primary">
                    Preset
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-y-auto">
              <div className="p-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select Dashboard ({dashboards.length})
              </div>
              <DropdownMenuSeparator />
              {dashboards.map((dash) => (
                <DropdownMenuItem
                  key={dash.id}
                  onClick={() => setActiveDashboardId(dash.id)}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="font-semibold text-xs truncate">{dash.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {dash.panels.length} panels
                    </span>
                  </div>
                  {dash.id === activeDashboardId && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 text-xs">
                <Plus className="h-3.5 w-3.5" /> Create New Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)} className="gap-2 text-xs">
                <Upload className="h-3.5 w-3.5" /> Import from JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeDashboard?.description && (
            <p className="text-xs text-muted-foreground hidden lg:inline max-w-md truncate">
              {activeDashboard.description}
            </p>
          )}
        </div>

        {/* Dashboard Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingLayout(!isEditingLayout)}
            className={`h-8 text-xs gap-1.5 ${
              isEditingLayout ? "bg-primary/20 text-primary border-primary/40" : ""
            }`}
          >
            <Edit2 className="h-3.5 w-3.5" />
            {isEditingLayout ? "Finish Editing" : "Edit Layout"}
          </Button>

          <Button size="sm" onClick={handleAddNewPanel} className="h-8 text-xs gap-1.5 bg-primary">
            <Plus className="h-3.5 w-3.5" />
            Add Panel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                Actions <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={handleExportDashboard} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateDashboard(activeDashboard.id)}
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate Dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetToPresets} className="gap-2 text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Reset Starter Presets
              </DropdownMenuItem>
              {dashboards.length > 1 && !activeDashboard.isPreset && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => deleteDashboard(activeDashboard.id)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Dashboard
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dynamic Template Variables Bar */}
      {activeDashboard.variables && activeDashboard.variables.length > 0 && (
        <VariableBar variables={activeDashboard.variables} />
      )}

      {/* Responsive Dashboard Grid */}
      <DashboardGrid dashboard={activeDashboard} />

      {/* Create Dashboard Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Create Custom Dashboard
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a new empty dashboard grid with custom variables and panels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Title</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Payments & Checkout Reliability"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateDashboard} className="text-xs">
                Create Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dashboard Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Import Dashboard JSON
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste a previously exported Lozana dashboard JSON definition
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste JSON here..."
              className="font-mono text-xs h-48"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleImportDashboard} className="text-xs">
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Panel Editor Modal for adding new panel */}
      <PanelEditorModal
        panel={editingPanel}
        open={newPanelOpen}
        onOpenChange={setNewPanelOpen}
        onSave={() => setNewPanelOpen(false)}
      />
    </div>
  );
}
