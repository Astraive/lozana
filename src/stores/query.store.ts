import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  isPinned?: boolean;
}

export interface QueryHistoryEntry {
  id: string;
  query: string;
  executedAt: string;
  durationMs: number;
  rowCount: number;
  error?: string;
}

export interface QuerySnippet {
  id: string;
  title: string;
  description: string;
  category: "HTTP & API" | "Errors & Panics" | "Performance" | "Tracing" | "Collector";
  query: string;
}

export const PRESET_SNIPPETS: QuerySnippet[] = [
  {
    id: "err-rate-service",
    title: "Error Rate by Service",
    description: "Percentage and count of error/fatal events aggregated by service",
    category: "Errors & Panics",
    query: 'from events | where level = "error" or level = "fatal" | summarize event_count = count() by service | sort event_count desc',
  },
  {
    id: "slow-endpoints",
    title: "Slowest HTTP Routes (P95 Latency)",
    description: "P50, P95, and P99 response times grouped by route",
    category: "HTTP & API",
    query: 'from events | where route != "" | summarize event_count = count(), p50_duration_ms = p50(duration_ms), p95_duration_ms = p95(duration_ms), p99_duration_ms = p99(duration_ms) by route | sort p95_duration_ms desc | take 20',
  },
  {
    id: "http-status-breakdown",
    title: "HTTP Status Code Distribution",
    description: "Count of 2xx, 4xx, 5xx requests over time",
    category: "HTTP & API",
    query: "from events | where status_code > 0 | summarize event_count = count() by status_code, bin(timestamp, 5m) | sort bin asc",
  },
  {
    id: "unhandled-panics",
    title: "Unhandled Panics and Exceptions",
    description: "Events containing stack traces or panic error types",
    category: "Errors & Panics",
    query: 'from events | where error.type != "" or error.stack != "" | sort timestamp desc | take 50',
  },
  {
    id: "latency-timeseries",
    title: "P95 Latency Over Time (5m bins)",
    description: "Trendline of system latency percentiles",
    category: "Performance",
    query: "from events | summarize p50_duration_ms = p50(duration_ms), p95_duration_ms = p95(duration_ms), p99_duration_ms = p99(duration_ms) by bin(timestamp, 5m) | sort bin asc",
  },
  {
    id: "active-traces",
    title: "Recent Multi-Span Traces",
    description: "Traces sorted by root execution duration",
    category: "Tracing",
    query: 'from events | where trace_id != "" | summarize event_count = count(), max_duration_ms = max(duration_ms) by trace_id | sort max_duration_ms desc | take 50',
  },
  {
    id: "collector-throughput",
    title: "Ingest Volume by Service",
    description: "Total event count per service in the current window",
    category: "Collector",
    query: "from events | summarize event_count = count() by service | sort event_count desc",
  },
];

interface QueryStoreState {
  tabs: QueryTab[];
  activeTabId: string;
  history: QueryHistoryEntry[];

  // Tab actions
  addTab: (query?: string, title?: string) => string;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  updateActiveTabQuery: (query: string) => void;
  renameTab: (id: string, title: string) => void;
  pinTab: (id: string) => void;

  // History actions
  addHistoryEntry: (entry: Omit<QueryHistoryEntry, "id" | "executedAt">) => void;
  clearHistory: () => void;

  // Quick getter
  getActiveQuery: () => string;
}

const DEFAULT_TAB: QueryTab = {
  id: "tab-1",
  title: "Query 1",
  query: "from events | limit 100",
  isPinned: false,
};

export const useQueryStore = create<QueryStoreState>()(
  persist(
    (set, get) => ({
      tabs: [DEFAULT_TAB],
      activeTabId: "tab-1",
      history: [],

      addTab: (query = "from events | limit 100", title) => {
        const nextId = "tab-" + Math.random().toString(36).substring(2, 9);
        const tabCount = get().tabs.length + 1;
        const newTab: QueryTab = {
          id: nextId,
          title: title || `Query ${tabCount}`,
          query,
        };
        set((s) => ({
          tabs: [...s.tabs, newTab],
          activeTabId: nextId,
        }));
        return nextId;
      },

      closeTab: (id) => {
        const currentTabs = get().tabs;
        if (currentTabs.length <= 1) {
          // Reset single tab
          set({
            tabs: [{ id: "tab-1", title: "Query 1", query: "from events | limit 100" }],
            activeTabId: "tab-1",
          });
          return;
        }

        const nextTabs = currentTabs.filter((t) => t.id !== id);
        let nextActiveId = get().activeTabId;
        if (nextActiveId === id) {
          nextActiveId = nextTabs[nextTabs.length - 1].id;
        }

        set({
          tabs: nextTabs,
          activeTabId: nextActiveId,
        });
      },

      setActiveTabId: (activeTabId) => set({ activeTabId }),

      updateActiveTabQuery: (query) => {
        const activeId = get().activeTabId;
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === activeId ? { ...t, query } : t)),
        }));
      },

      renameTab: (id, title) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
        }));
      },

      pinTab: (id) => {
        set((s) => ({
          tabs: s.tabs.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t)),
        }));
      },

      addHistoryEntry: (entry) => {
        const item: QueryHistoryEntry = {
          id: "hist-" + Math.random().toString(36).substring(2, 9),
          executedAt: new Date().toISOString(),
          ...entry,
        };
        set((s) => ({
          // Keep last 50 queries in history
          history: [item, ...s.history.slice(0, 49)],
        }));
      },

      clearHistory: () => set({ history: [] }),

      getActiveQuery: () => {
        const activeTab = get().tabs.find((t) => t.id === get().activeTabId);
        return activeTab?.query || "from events | limit 100";
      },
    }),
    {
      name: "loza-query-store",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        history: state.history,
      }),
    }
  )
);
