import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CortexReconstruction } from "@/types/cortex";

type Cleanup = () => void;
type HarnessState = { value?: unknown; deps?: readonly unknown[]; cleanup?: Cleanup };
type ReactElementLike = {
  props?: { children?: unknown; onClick?: unknown; className?: unknown };
};

// A tiny hooks harness so the component can be exercised as a plain function
// without a DOM renderer. It tracks state by call order, captures effect
// cleanups, and is shared with the mocked `react` module below.
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

vi.mock("@/lib/api/cortex", () => ({
  submitRemediationFeedback: vi.fn().mockResolvedValue(undefined),
}));

import { IncidentWorkbench } from "@/components/cortex/IncidentWorkbench";

const reconstruction = {
  incident_id: "INC-1",
  title: "Test incident",
  confidence: 0.95,
  summary: "summary",
  root_cause_service: "svc-a",
  root_cause_summary: "root cause",
  started_at: "2026-01-01T00:00:00Z",
  severity: "critical",
  causal_chain: [],
  symptoms: [],
  affected_services: [],
  similar_incidents: [],
  remediations: [
    { id: "rem-1", action: "one", description: "d1", command: "cmd-1", urgency: "immediate", automated_supported: false },
    { id: "rem-2", action: "two", description: "d2", command: "cmd-2", urgency: "recommended", automated_supported: false },
  ],
  timeline: [],
} as CortexReconstruction;

function render() {
  harness.index = 0;
  return IncidentWorkbench({ reconstruction });
}

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

function copyButtons() {
  return (collectElements(render()) as ReactElementLike[]).filter(
    (el) =>
      typeof el.props?.onClick === "function" &&
      typeof el.props?.className === "string" &&
      el.props.className.includes("w-7 p-0")
  );
}

describe("IncidentWorkbench copy-reset timer", () => {
  beforeEach(() => {
    harness.reset();
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn() } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps a single pending reset timer across rapid successive copies", () => {
    const buttons = copyButtons();
    expect(buttons).toHaveLength(2);

    vi.useFakeTimers();
    (buttons[0].props!.onClick as () => void)();
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1000);
    (buttons[1].props!.onClick as () => void)();
    // The stale timer from the first copy must have been cleared, otherwise a
    // second timer is pending and the first one would clear the newer state.
    expect(vi.getTimerCount()).toBe(1);
  });

  it("clears the pending reset timer on unmount", () => {
    const buttons = copyButtons();
    expect(buttons).toHaveLength(2);

    vi.useFakeTimers();
    (buttons[0].props!.onClick as () => void)();
    expect(vi.getTimerCount()).toBe(1);

    // Simulate unmount by running the effect cleanup registered by the component.
    harness.cleanups.forEach((cleanup) => cleanup());
    expect(vi.getTimerCount()).toBe(0);
  });
});
