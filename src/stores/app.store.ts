import { create } from "zustand";
import { persist } from "zustand/middleware";
import { removeScopeQueries } from "@/lib/query-client";

export type Environment = "all" | "production" | "staging" | "dev";
export type ThemeMode = "dark" | "light" | "system";

export interface AppState {
  // Connection & Tenancy
  collectorUrl: string;
  cortexUrl: string;
  wsUrl: string;
  apiKey: string;
  activeCollector: string;
  activeEnvironment: Environment;
  queryScopeRevision: number;

  // UI & Preferences
  theme: ThemeMode;
  autoRefreshInterval: number; // 0 = off, seconds
  sidebarCollapsed: boolean;
  timeRange: string;

  // Setters
  setCollectorUrl: (url: string) => void;
  setCortexUrl: (url: string) => void;
  setWsUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setActiveCollector: (collector: string) => void;
  setActiveEnvironment: (env: Environment) => void;
  setTheme: (theme: ThemeMode) => void;
  setAutoRefreshInterval: (seconds: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTimeRange: (range: string) => void;
  resetConnectionDefaults: () => void;
}

const DEFAULT_COLLECTOR_URL =
  typeof window !== "undefined"
    ? localStorage.getItem("loza-collector-url") ||
      (import.meta.env.VITE_LOZANA_API_URL as string) ||
      "http://localhost:9308"
    : "http://localhost:9308";

const DEFAULT_CORTEX_URL =
  typeof window !== "undefined"
    ? localStorage.getItem("loza-cortex-url") ||
      (import.meta.env.VITE_CORTEX_URL as string) ||
      "http://localhost:9312"
    : "http://localhost:9312";

const DEFAULT_WS_URL =
  typeof window !== "undefined"
    ? localStorage.getItem("loza-ws-url") ||
      (import.meta.env.VITE_WS_URL as string) ||
      "ws://localhost:9308/tail"
    : "ws://localhost:9308/tail";

const DEFAULT_API_KEY = (() => {
  if (typeof window === "undefined") return "";
  const sessionKey = sessionStorage.getItem("loza-api-key") || "";
  localStorage.removeItem("loza-api-key");
  return sessionKey;
})();

type PersistedAppState = Pick<
  AppState,
  | "collectorUrl"
  | "cortexUrl"
  | "wsUrl"
  | "activeCollector"
  | "activeEnvironment"
  | "theme"
  | "autoRefreshInterval"
  | "sidebarCollapsed"
  | "timeRange"
>;

export function selectPersistedAppState(state: AppState): PersistedAppState {
  return {
    collectorUrl: state.collectorUrl,
    cortexUrl: state.cortexUrl,
    wsUrl: state.wsUrl,
    activeCollector: state.activeCollector,
    activeEnvironment: state.activeEnvironment,
    theme: state.theme,
    autoRefreshInterval: state.autoRefreshInterval,
    sidebarCollapsed: state.sidebarCollapsed,
    timeRange: state.timeRange,
  };
}

export function migratePersistedAppState(persistedState: unknown): PersistedAppState {
  const state =
    persistedState && typeof persistedState === "object"
      ? (persistedState as Partial<PersistedAppState>)
      : {};
  return {
    collectorUrl: state.collectorUrl ?? DEFAULT_COLLECTOR_URL,
    cortexUrl: state.cortexUrl ?? DEFAULT_CORTEX_URL,
    wsUrl: state.wsUrl ?? DEFAULT_WS_URL,
    activeCollector: state.activeCollector ?? "",
    activeEnvironment: state.activeEnvironment ?? "all",
    theme: state.theme ?? "dark",
    autoRefreshInterval: state.autoRefreshInterval ?? 0,
    sidebarCollapsed: state.sidebarCollapsed ?? false,
    timeRange: state.timeRange ?? "1h",
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      collectorUrl: DEFAULT_COLLECTOR_URL,
      cortexUrl: DEFAULT_CORTEX_URL,
      wsUrl: DEFAULT_WS_URL,
      apiKey: DEFAULT_API_KEY,
      activeCollector: "",
      activeEnvironment: "all",
      queryScopeRevision: 0,
      theme: "dark",
      autoRefreshInterval: 0,
      sidebarCollapsed: false,
      timeRange: "1h",

      setCollectorUrl: (url) => {
        const cleanUrl = url.trim().replace(/\/+$/, "");
        if (get().collectorUrl === cleanUrl) return;
        if (typeof window !== "undefined") {
          localStorage.setItem("loza-collector-url", cleanUrl);
        }
        removeScopeQueries();
        set((state) => ({ collectorUrl: cleanUrl, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setCortexUrl: (url) => {
        const cleanUrl = url.trim().replace(/\/+$/, "");
        if (get().cortexUrl === cleanUrl) return;
        if (typeof window !== "undefined") {
          localStorage.setItem("loza-cortex-url", cleanUrl);
        }
        removeScopeQueries();
        set((state) => ({ cortexUrl: cleanUrl, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setWsUrl: (url) => {
        const cleanUrl = url.trim();
        if (typeof window !== "undefined") {
          localStorage.setItem("loza-ws-url", cleanUrl);
        }
        set({ wsUrl: cleanUrl });
      },
      setApiKey: (key) => {
        const cleanKey = key.trim();
        if (get().apiKey === cleanKey) return;
        if (typeof window !== "undefined") {
          localStorage.removeItem("loza-api-key");
          if (cleanKey) {
            sessionStorage.setItem("loza-api-key", cleanKey);
          } else {
            sessionStorage.removeItem("loza-api-key");
          }
        }
        removeScopeQueries();
        set((state) => ({ apiKey: cleanKey, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setActiveCollector: (activeCollector) => {
        if (get().activeCollector === activeCollector) return;
        removeScopeQueries();
        set((state) => ({ activeCollector, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setActiveEnvironment: (activeEnvironment) => {
        if (get().activeEnvironment === activeEnvironment) return;
        removeScopeQueries();
        set((state) => ({ activeEnvironment, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setTheme: (theme) => set({ theme }),
      setAutoRefreshInterval: (autoRefreshInterval) => set({ autoRefreshInterval }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTimeRange: (timeRange) => set({ timeRange }),
      resetConnectionDefaults: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("loza-collector-url");
          localStorage.removeItem("loza-cortex-url");
          localStorage.removeItem("loza-ws-url");
          localStorage.removeItem("loza-api-key");
          sessionStorage.removeItem("loza-api-key");
        }
        const current = get();
        const scopeChanged =
          current.collectorUrl !== "http://localhost:9308" ||
          current.cortexUrl !== "http://localhost:9312" ||
          current.apiKey !== "" ||
          current.activeCollector !== "" ||
          current.activeEnvironment !== "all";
        if (scopeChanged) removeScopeQueries();
        set({
          collectorUrl: "http://localhost:9308",
          cortexUrl: "http://localhost:9312",
          wsUrl: "ws://localhost:9308/tail",
          apiKey: "",
          activeCollector: "",
          activeEnvironment: "all",
          queryScopeRevision: current.queryScopeRevision + Number(scopeChanged),
        });
      },
    }),
    {
      name: "loza-app-store",
      version: 1,
      partialize: selectPersistedAppState,
      migrate: migratePersistedAppState,
    }
  )
);
