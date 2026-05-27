import { create } from "zustand";

interface Panel {
  id: string;
  title: string;
  type: string;
  query: string;
  position: { x: number; y: number; w: number; h: number };
}

interface DashboardState {
  panels: Panel[];
  timeRange: string;
  variables: Record<string, string>;
  addPanel: (panel: Panel) => void;
  removePanel: (id: string) => void;
  setTimeRange: (r: string) => void;
  setVariable: (key: string, value: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  panels: [],
  timeRange: "1h",
  variables: {},
  addPanel: (panel) => set((s) => ({ panels: [...s.panels, panel] })),
  removePanel: (id) => set((s) => ({ panels: s.panels.filter((p) => p.id !== id) })),
  setTimeRange: (timeRange) => set({ timeRange }),
  setVariable: (key, value) =>
    set((s) => ({ variables: { ...s.variables, [key]: value } })),
}));
