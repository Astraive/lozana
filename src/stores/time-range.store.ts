import { create } from "zustand";

interface TimeRangeState {
  range: string;
  from: Date | null;
  to: Date | null;
  setRange: (range: string) => void;
  setCustom: (from: Date, to: Date) => void;
}

export const useTimeRangeStore = create<TimeRangeState>((set) => ({
  range: "1h",
  from: null,
  to: null,
  setRange: (range) => set({ range, from: null, to: null }),
  setCustom: (from, to) => set({ range: "custom", from, to }),
}));
