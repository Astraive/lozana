import { create } from "zustand";

interface QueryState {
  query: string;
  timeRange: string;
  service: string;
  level: string;
  isLive: boolean;
  setQuery: (q: string) => void;
  setTimeRange: (r: string) => void;
  setService: (s: string) => void;
  setLevel: (l: string) => void;
  setIsLive: (v: boolean) => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  query: "from events | limit 100",
  timeRange: "1h",
  service: "",
  level: "",
  isLive: false,
  setQuery: (query) => set({ query }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setService: (service) => set({ service }),
  setLevel: (level) => set({ level }),
  setIsLive: (isLive) => set({ isLive }),
}));
