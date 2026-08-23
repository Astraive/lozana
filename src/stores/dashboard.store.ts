import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Dashboard, Panel } from "@/types/dashboard";
import { STARTER_PRESETS } from "@/lib/storage/dashboard-storage";

interface DashboardStoreState {
  dashboards: Dashboard[];
  activeDashboardId: string;
  variableValues: Record<string, string>;
  isEditingLayout: boolean;

  // Dashboard actions
  addDashboard: (d: Partial<Dashboard>) => string;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  deleteDashboard: (id: string) => void;
  duplicateDashboard: (id: string) => string;
  setActiveDashboardId: (id: string) => void;
  resetToPresets: () => void;
  setIsEditingLayout: (editing: boolean) => void;

  // Panel actions
  addPanelToActiveDashboard: (panel: Omit<Panel, "id">) => string;
  updatePanelInActiveDashboard: (panelId: string, updates: Partial<Panel>) => void;
  removePanelFromActiveDashboard: (panelId: string) => void;
  duplicatePanelInActiveDashboard: (panelId: string) => void;

  // Variable actions
  setVariableValue: (name: string, value: string) => void;
  getActiveDashboard: () => Dashboard | undefined;
  interpolateQuery: (query: string) => string;
}

export const useDashboardStore = create<DashboardStoreState>()(
  persist(
    (set, get) => ({
      dashboards: STARTER_PRESETS,
      activeDashboardId: STARTER_PRESETS[0].id,
      variableValues: {
        service: "all",
        environment: "all",
      },
      isEditingLayout: false,

      addDashboard: (d) => {
        const id = "dash-" + Math.random().toString(36).substring(2, 9);
        const newDashboard: Dashboard = {
          id,
          title: d.title || "Untitled Dashboard",
          description: d.description || "",
          tags: d.tags || [],
          timeRange: d.timeRange || "1h",
          variables: d.variables || [],
          panels: d.panels || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPreset: false,
        };
        set((s) => ({
          dashboards: [...s.dashboards, newDashboard],
          activeDashboardId: id,
        }));
        return id;
      },

      updateDashboard: (id, updates) => {
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
          ),
        }));
      },

      deleteDashboard: (id) => {
        const remaining = get().dashboards.filter((d) => d.id !== id);
        const fallback = remaining.length > 0 ? remaining[0].id : "";
        set({
          dashboards: remaining.length > 0 ? remaining : STARTER_PRESETS,
          activeDashboardId: get().activeDashboardId === id ? (fallback || STARTER_PRESETS[0].id) : get().activeDashboardId,
        });
      },

      duplicateDashboard: (id) => {
        const existing = get().dashboards.find((d) => d.id === id);
        if (!existing) return "";

        const nextId = "dash-" + Math.random().toString(36).substring(2, 9);
        const copy: Dashboard = {
          ...existing,
          id: nextId,
          title: `${existing.title} (Copy)`,
          isPreset: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((s) => ({
          dashboards: [...s.dashboards, copy],
          activeDashboardId: nextId,
        }));
        return nextId;
      },

      setActiveDashboardId: (activeDashboardId) => set({ activeDashboardId }),

      resetToPresets: () => {
        set({
          dashboards: STARTER_PRESETS,
          activeDashboardId: STARTER_PRESETS[0].id,
        });
      },

      setIsEditingLayout: (isEditingLayout) => set({ isEditingLayout }),

      addPanelToActiveDashboard: (panel) => {
        const activeDash = get().getActiveDashboard();
        if (!activeDash) return "";

        const panelId = "p-" + Math.random().toString(36).substring(2, 9);
        const newPanel: Panel = {
          id: panelId,
          title: panel.title || "New Panel",
          type: panel.type || "timeseries",
          query: panel.query || "from events | limit 100",
          description: panel.description,
          content: panel.content,
          position: panel.position || { x: 0, y: 100, w: 6, h: 4 },
          visualization: panel.visualization,
        };

        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === activeDash.id
              ? { ...d, panels: [...d.panels, newPanel], updatedAt: new Date().toISOString() }
              : d
          ),
        }));

        return panelId;
      },

      updatePanelInActiveDashboard: (panelId, updates) => {
        const activeDash = get().getActiveDashboard();
        if (!activeDash) return;

        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === activeDash.id
              ? {
                  ...d,
                  panels: d.panels.map((p) => (p.id === panelId ? { ...p, ...updates } : p)),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }));
      },

      removePanelFromActiveDashboard: (panelId) => {
        const activeDash = get().getActiveDashboard();
        if (!activeDash) return;

        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === activeDash.id
              ? {
                  ...d,
                  panels: d.panels.filter((p) => p.id !== panelId),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }));
      },

      duplicatePanelInActiveDashboard: (panelId) => {
        const activeDash = get().getActiveDashboard();
        if (!activeDash) return;

        const target = activeDash.panels.find((p) => p.id === panelId);
        if (!target) return;

        const nextId = "p-" + Math.random().toString(36).substring(2, 9);
        const copy: Panel = {
          ...target,
          id: nextId,
          title: `${target.title} (Copy)`,
          position: { ...target.position, y: target.position.y + target.position.h },
        };

        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === activeDash.id
              ? { ...d, panels: [...d.panels, copy], updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      setVariableValue: (name, value) => {
        set((s) => ({
          variableValues: { ...s.variableValues, [name]: value },
        }));
      },

      getActiveDashboard: () => {
        const activeId = get().activeDashboardId;
        return get().dashboards.find((d) => d.id === activeId) || get().dashboards[0];
      },

      interpolateQuery: (query: string) => {
        let result = query;
        const vars = get().variableValues;

        for (const [key, val] of Object.entries(vars)) {
          if (!val || val === "all") {
            // Remove where filters for "all" if appropriate or replace with true condition
            const regexSimple = new RegExp(`where\\s+${key}\\s*=\\s*"\\$${key}"`, "gi");
            result = result.replace(regexSimple, "where 1=1");
            const regexWrapped = new RegExp(`where\\s+${key}\\s*=\\s*"\\$\\{${key}\\}"`, "gi");
            result = result.replace(regexWrapped, "where 1=1");
          }

          // Replace $var and ${var}
          result = result.replace(new RegExp(`\\$${key}\\b`, "g"), val);
          result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), val);
        }

        return result;
      },
    }),
    {
      name: "loza-dashboard-store",
      partialize: (state) => ({
        dashboards: state.dashboards,
        activeDashboardId: state.activeDashboardId,
        variableValues: state.variableValues,
      }),
    }
  )
);
