import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  timeRange: string;
  toggleSidebar: () => void;
  setTimeRange: (range: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  timeRange: "1h",
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTimeRange: (timeRange) => set({ timeRange }),
}));
