import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearStoredValue, readStoredValue, writeStoredValue } from "@/lib/storage";
import { validateEndpointUrl, type EndpointPurpose } from "@/lib/api/endpoint-policy";
import { removeScopeQueries } from "@/lib/query-client";

export type Environment = "all" | "production" | "staging" | "dev";
export type ThemeMode = "dark" | "light" | "system";

export interface AppState {
  // Connection & Tenancy
  collectorUrl: string;
  cortexUrl: string;
  wsUrl: string;
  apiKey: string;
  cortexApiKey: string;
  activeCollector: string;
  activeEnvironment: Environment;
  activeDatabaseConnection: string;
  queryScopeRevision: number;
  connectionStateRevision: number;
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
  setCortexApiKey: (key: string) => void;
  setActiveCollector: (collector: string) => void;
  setActiveEnvironment: (env: Environment) => void;
  setActiveDatabaseConnection: (connection: string) => void;
  setTheme: (theme: ThemeMode) => void;
  setAutoRefreshInterval: (seconds: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTimeRange: (range: string) => void;
  resetConnectionDefaults: () => void;
}

/** Persisted state is writable by page scripts, so never trust it as-is. */
function safeEndpoint(
  candidate: unknown,
  fallback: string,
  purpose: EndpointPurpose
): string {
  if (typeof candidate === "string" && candidate.trim()) {
    try {
      validateEndpointUrl(candidate, { purpose });
      return candidate.trim();
    } catch {
      // Discard an invalid or disallowed stored URL.
    }
  }
  return fallback;
}

const DEFAULT_COLLECTOR_URL = safeEndpoint(
  typeof window !== "undefined"
    ? localStorage.getItem("loza-collector-url") ||
      (import.meta.env.VITE_LOZANA_API_URL as string)
    : null,
  "http://localhost:9308",
  "http"
);

const DEFAULT_CORTEX_URL = safeEndpoint(
  typeof window !== "undefined"
    ? localStorage.getItem("loza-cortex-url") ||
      (import.meta.env.VITE_CORTEX_URL as string)
    : null,
  "http://localhost:9312",
  "http"
);

const DEFAULT_WS_URL = safeEndpoint(
  typeof window !== "undefined"
    ? localStorage.getItem("loza-ws-url") ||
      (import.meta.env.VITE_WS_URL as string)
    : null,
  "ws://localhost:9308/ws/tail",
  "websocket"
);

// Migrate legacy keys out of localStorage without wiping the session credential.
const DEFAULT_API_KEY = (() => {
  if (typeof window === "undefined") return "";
  const sessionKey = sessionStorage.getItem("loza-api-key") || "";
  localStorage.removeItem("loza-api-key");
  return sessionKey;
})();

const DEFAULT_CORTEX_API_KEY = (() => {
  if (typeof window === "undefined") return "";
  const sessionKey = sessionStorage.getItem("loza-cortex-api-key") || "";
  localStorage.removeItem("loza-cortex-api-key");
  return sessionKey;
})();

type PersistedAppState = Pick<
  AppState,
  | "collectorUrl"
  | "cortexUrl"
  | "wsUrl"
  | "activeCollector"
  | "activeEnvironment"
  | "activeDatabaseConnection"
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
    activeDatabaseConnection: state.activeDatabaseConnection,
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
    collectorUrl: safeEndpoint(state.collectorUrl, DEFAULT_COLLECTOR_URL, "http"),
    cortexUrl: safeEndpoint(state.cortexUrl, DEFAULT_CORTEX_URL, "http"),
    wsUrl: safeEndpoint(state.wsUrl, DEFAULT_WS_URL, "websocket"),
    activeCollector: state.activeCollector ?? "",
    activeEnvironment: state.activeEnvironment ?? "all",
    activeDatabaseConnection: state.activeDatabaseConnection ?? "",
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
      cortexApiKey: DEFAULT_CORTEX_API_KEY,
      activeCollector: "",
      activeEnvironment: "all",
      activeDatabaseConnection: "",
      queryScopeRevision: 0,
      connectionStateRevision: 0,
      theme: "dark",
      autoRefreshInterval: 0,
      sidebarCollapsed: false,
      timeRange: "1h",

      setCollectorUrl: (url) => {
        const cleanUrl = url.trim().replace(/\/+$/, "");
        validateEndpointUrl(cleanUrl, { purpose: "http", requireTls: Boolean(get().apiKey) });
        if (get().collectorUrl === cleanUrl) return;
        writeStoredValue("loza-collector-url", cleanUrl);
        removeScopeQueries();
        set((state) => ({ collectorUrl: cleanUrl, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setCortexUrl: (url) => {
        const cleanUrl = url.trim().replace(/\/+$/, "");
        validateEndpointUrl(cleanUrl, { purpose: "http", requireTls: Boolean(get().apiKey) });
        if (get().cortexUrl === cleanUrl) return;
        writeStoredValue("loza-cortex-url", cleanUrl);
        removeScopeQueries();
        set((state) => ({ cortexUrl: cleanUrl, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setWsUrl: (url) => {
        const cleanUrl = url.trim();
        writeStoredValue("loza-ws-url", cleanUrl);
        validateEndpointUrl(cleanUrl, { purpose: "websocket", requireTls: Boolean(get().apiKey) });
        set({ wsUrl: cleanUrl });
      },
      setApiKey: (key) => {
        const cleanKey = key.trim();
        if (get().apiKey === cleanKey) return;
        // Writes may clean up the legacy localStorage key; reads never do.
        clearStoredValue("loza-api-key");
        if (cleanKey) {
          writeStoredValue("loza-api-key", cleanKey, "session");
        } else {
          clearStoredValue("loza-api-key", "session");
        }
        removeScopeQueries();
        set((state) => ({ apiKey: cleanKey, queryScopeRevision: state.queryScopeRevision + 1 }));
      },
      setCortexApiKey: (key) => {
        const cleanKey = key.trim();
        if (get().cortexApiKey === cleanKey) return;
        if (typeof window !== "undefined") {
          localStorage.removeItem("loza-cortex-api-key");
          if (cleanKey) {
            sessionStorage.setItem("loza-cortex-api-key", cleanKey);
          } else {
            sessionStorage.removeItem("loza-cortex-api-key");
          }
        }
        set({ cortexApiKey: cleanKey });
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
      setActiveDatabaseConnection: (activeDatabaseConnection) => {
        if (get().activeDatabaseConnection === activeDatabaseConnection) return;
        removeScopeQueries();
        set((state) => ({
          activeDatabaseConnection,
          queryScopeRevision: state.queryScopeRevision + 1,
          connectionStateRevision: state.connectionStateRevision + 1,
        }));
      },
      setTheme: (theme) => set({ theme }),
      setAutoRefreshInterval: (autoRefreshInterval) => set({ autoRefreshInterval }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTimeRange: (timeRange) => set({ timeRange }),
      resetConnectionDefaults: () => {
        clearStoredValue("loza-collector-url");
        clearStoredValue("loza-cortex-url");
        clearStoredValue("loza-ws-url");
        clearStoredValue("loza-api-key");
        clearStoredValue("loza-api-key", "session");
        if (typeof window !== "undefined") {
          localStorage.removeItem("loza-collector-url");
          localStorage.removeItem("loza-cortex-url");
          localStorage.removeItem("loza-ws-url");
          localStorage.removeItem("loza-api-key");
          localStorage.removeItem("loza-cortex-api-key");
          sessionStorage.removeItem("loza-api-key");
          sessionStorage.removeItem("loza-cortex-api-key");
        }
        const current = get();
        const scopeChanged =
          current.collectorUrl !== "http://localhost:9308" ||
          current.cortexUrl !== "http://localhost:9312" ||
          current.apiKey !== "" ||
          current.cortexApiKey !== "" ||
          current.activeCollector !== "" ||
          current.activeEnvironment !== "all" ||
          current.activeDatabaseConnection !== "";
        if (scopeChanged) removeScopeQueries();
        set({
          collectorUrl: "http://localhost:9308",
          cortexUrl: "http://localhost:9312",
          wsUrl: "ws://localhost:9308/ws/tail",
          apiKey: "",
          cortexApiKey: "",
          activeCollector: "",
          activeEnvironment: "all",
          activeDatabaseConnection: "",
          queryScopeRevision: current.queryScopeRevision + Number(scopeChanged),
          connectionStateRevision:
            current.connectionStateRevision + Number(current.activeDatabaseConnection !== ""),
        });
      },
    }),
    {
      name: "loza-app-store",
      version: 2,
      partialize: selectPersistedAppState,
      migrate: migratePersistedAppState,
    }
  )
);
