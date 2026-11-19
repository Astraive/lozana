import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TraceSpan } from "@/lib/traces/trace-builder";

type Cleanup = () => void;
type HarnessState = { value?: unknown; deps?: readonly unknown[]; cleanup?: Cleanup };
type ReactElementLike = {
  props?: { children?: unknown; onClick?: unknown; className?: unknown };
};

// Minimal hooks harness: exercise the component as a plain function without a
// DOM renderer, tracking state by call order and capturing effect cleanups.
const harness = vi.hoisted(() => ({
  states: [] as HarnessState[],
  index: 0,
  cleanups: [] as Cleanup[],
  reset() {
    this.states = [];
    this.index = 0;
    this.cleanups = [];
  },
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useState(initial: unknown): [unknown, (next: unknown) => void] {
      const i = harness.index++;
      if (!harness.states[i]) {
        harness.states[i] = {
          value: typeof initial === "function" ? (initial as () => unknown)() : initial,
        };
      }
      const setState = (next: unknown) => {
        const s = harness.states[i];
        s.value = typeof next === "function" ? (next as (v: unknown) => unknown)(s.value) : next;
      };
      return [harness.states[i].value, setState];
    },
    useRef<T>(initial: T): { current: T } {
      const i = harness.index++;
      if (!harness.states[i]) {
        harness.states[i] = { value: { current: initial } };
      }
      return harness.states[i].value as { current: T };
    },
    useEffect(effect: () => void | Cleanup, deps?: readonly unknown[]): void {
      const i = harness.index++;
      const prev = harness.states[i];
      const changed =
        !prev ||
        !prev.deps ||
        !deps ||
        deps.length !== prev.deps.length ||
        deps.some((d, j) => !Object.is(d, prev.deps![j]));
      if (changed) {
        const cleanup = effect();
        harness.states[i] = {
          deps,
          cleanup: typeof cleanup === "function" ? cleanup : undefined,
        };
        if (typeof cleanup === "function") harness.cleanups.push(cleanup);
      }
    },
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { SpanDetailPanel } from "@/components/traces/SpanDetailPanel";

const span = {
  id: "s1",
  span_id: "span-1",
  parent_span_id: undefined,
  trace_id: "tr-1",
  name: "GET /checkout",
  service: "api-gateway",
  level: "info",
  kind: "server",
  outcome: "success",
  timestamp: "2026-01-01T00:00:00Z",
  duration_ms: 10,
  start_offset_ms: 0,
  depth: 0,
  children: [],
  checkpoints: [],
  process: [],
  attrs: {},
} as TraceSpan;

function collectElements(node: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectElements(n, out));
  } else if (node !== null && typeof node === "object" && "props" in node) {
    const el = node as ReactElementLike;
    out.push(el);
    collectElements(el.props?.children, out);
  }
  return out;
}

function firstCopyHandler(): () => Promise<void> {
  harness.index = 0;
  const tree = SpanDetailPanel({ span, open: true, onOpenChange: vi.fn() });
  const handler = (collectElements(tree) as ReactElementLike[]).find(
    (el) => typeof el.props?.onClick === "function"
  )?.props?.onClick;
  if (typeof handler !== "function") throw new Error("no copy handler rendered");
  return handler as () => Promise<void>;
}

describe("SpanDetailPanel copy-state reset timer", () => {
  beforeEach(() => {
    harness.reset();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps a single pending reset timer across rapid successive copies", async () => {
    vi.useFakeTimers();
    const copy = firstCopyHandler();

    await copy();
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1000);
    await copy();
    // The stale timer from the first click must have been cleared; otherwise
    // two timers remain and the first one resets the newer copied state early.
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(vi.getTimerCount()).toBe(0);
    expect(harness.states[0].value).toBeNull();
  });

  it("clears the pending reset timer on unmount", async () => {
    vi.useFakeTimers();
    const copy = firstCopyHandler();

    await copy();
    expect(vi.getTimerCount()).toBe(1);

    // Simulate unmount by running the effect cleanup registered by the component.
    harness.cleanups.forEach((cleanup) => cleanup());
    expect(vi.getTimerCount()).toBe(0);
  });
});
