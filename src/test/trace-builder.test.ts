import { describe, it, expect } from "vitest";
import { buildTraceTree } from "@/lib/traces/trace-builder";
import { MOCK_WIDE_EVENTS } from "./fixtures/events";

describe("Trace Tree Builder", () => {
  it("reconstructs span hierarchy tree correctly", () => {
    const tree = buildTraceTree(MOCK_WIDE_EVENTS);

    expect(tree.trace_id).toBe("tr_test_123");
    expect(tree.span_count).toBe(3);
    expect(tree.service_count).toBe(3);
    expect(tree.error_count).toBe(1);
    expect(tree.root_spans.length).toBe(1);

    const root = tree.root_spans[0];
    expect(root.span_id).toBe("span_root");
    expect(root.service).toBe("api-gateway");
    expect(root.depth).toBe(0);
    expect(root.children.length).toBe(1);

    const child1 = root.children[0];
    expect(child1.span_id).toBe("span_child_1");
    expect(child1.service).toBe("checkout-api");
    expect(child1.depth).toBe(1);
    expect(child1.children.length).toBe(1);

    const child2 = child1.children[0];
    expect(child2.span_id).toBe("span_child_2");
    expect(child2.service).toBe("payment-gw");
    expect(child2.depth).toBe(2);
    expect(child2.level).toBe("error");
  });

  it("calculates intra-span checkpoints and process steps", () => {
    const tree = buildTraceTree(MOCK_WIDE_EVENTS);
    const root = tree.root_spans[0];

    expect(root.checkpoints.length).toBe(3);
    expect(root.checkpoints[0].name).toBe("auth_verify");
    expect(root.checkpoints[0].at_ms).toBe(15);
    expect(root.process.length).toBe(2);
  });

  it("identifies critical path spans", () => {
    const tree = buildTraceTree(MOCK_WIDE_EVENTS);

    expect(tree.critical_path_ids.length).toBeGreaterThan(0);
    expect(tree.critical_path_ids).toContain("span_root");
    expect(tree.root_spans[0].is_critical_path).toBe(true);
  });

  it("computes critical path from every root span when a trace has multiple roots", () => {
    const events = [
      {
        trace_id: "tr_multi_root",
        timestamp: "2026-01-01T00:00:00.000Z",
        service: "svc-a",
        event: "root.a",
        span_id: "root-a",
        duration_ms: 100,
      },
      {
        trace_id: "tr_multi_root",
        timestamp: "2026-01-01T00:00:00.010Z",
        service: "svc-a",
        event: "child.a",
        span_id: "child-a",
        parent_span_id: "root-a",
        duration_ms: 50,
      },
      {
        trace_id: "tr_multi_root",
        timestamp: "2026-01-01T00:00:00.020Z",
        service: "svc-b",
        event: "root.b",
        span_id: "root-b",
        duration_ms: 80,
      },
      {
        trace_id: "tr_multi_root",
        timestamp: "2026-01-01T00:00:00.030Z",
        service: "svc-b",
        event: "child.b",
        span_id: "child-b",
        parent_span_id: "root-b",
        duration_ms: 40,
      },
    ];

    const tree = buildTraceTree(events);

    // Two independent root trees: the fallback nesting must not have collapsed them.
    expect(tree.root_spans.map((root) => root.span_id)).toEqual(["root-a", "root-b"]);

    // Both roots and a descendant from each tree are on the critical path.
    expect(tree.critical_path_ids).toContain("root-a");
    expect(tree.critical_path_ids).toContain("child-a");
    expect(tree.critical_path_ids).toContain("root-b");
    expect(tree.critical_path_ids).toContain("child-b");
    expect(tree.root_spans.every((root) => root.is_critical_path)).toBe(true);
  });

  it("computes service summaries with distinct colors", () => {
    const tree = buildTraceTree(MOCK_WIDE_EVENTS);

    expect(tree.services.length).toBe(3);
    const serviceNames = tree.services.map((s) => s.service);
    expect(serviceNames).toContain("api-gateway");
    expect(serviceNames).toContain("checkout-api");
    expect(serviceNames).toContain("payment-gw");

    for (const svc of tree.services) {
      expect(svc.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("preserves each root span when no hierarchy is declared", () => {
    const events = [
      {
        trace_id: "tr_flat",
        timestamp: "2026-01-01T00:00:00.000Z",
        service: "svc-a",
        event: "alpha",
        span_id: "span-a",
        duration_ms: 20,
      },
      {
        trace_id: "tr_flat",
        timestamp: "2026-01-01T00:00:00.010Z",
        service: "svc-b",
        event: "beta",
        span_id: "span-b",
        duration_ms: 30,
      },
      {
        trace_id: "tr_flat",
        timestamp: "2026-01-01T00:00:00.020Z",
        service: "svc-c",
        event: "gamma",
        span_id: "span-c",
        duration_ms: 40,
      },
    ];

    const tree = buildTraceTree(events);

    expect(tree.root_spans.length).toBe(events.length);
    expect(tree.root_spans.map((root) => root.span_id)).toEqual([
      "span-a",
      "span-b",
      "span-c",
    ]);
    for (const root of tree.root_spans) {
      expect(root.depth).toBe(0);
      expect(root.children.length).toBe(0);
      expect(root.parent_span_id).toBeUndefined();
      expect(root.is_critical_path).toBe(true);
    }
  });

  it("does not collapse spans with unresolvable parents into one root", () => {
    const events = [
      {
        trace_id: "tr_orphan",
        timestamp: "2026-01-01T00:00:00.000Z",
        service: "svc-a",
        event: "root",
        span_id: "span-root",
      },
      {
        trace_id: "tr_orphan",
        timestamp: "2026-01-01T00:00:00.010Z",
        service: "svc-b",
        event: "orphan",
        span_id: "span-orphan",
        parent_span_id: "missing-parent",
      },
    ];

    const tree = buildTraceTree(events);

    expect(tree.root_spans.length).toBe(2);
    expect(tree.root_spans.map((root) => root.span_id)).toEqual([
      "span-root",
      "span-orphan",
    ]);
    expect(tree.root_spans.every((root) => root.depth === 0)).toBe(true);
    expect(tree.all_spans.every((span) => span.children.length === 0)).toBe(true);
  });

  it("handles empty events safely", () => {
    const emptyTree = buildTraceTree([]);
    expect(emptyTree.span_count).toBe(0);
    expect(emptyTree.root_spans.length).toBe(0);
    expect(emptyTree.total_duration_ms).toBe(0);
  });

  it("derives stable unique identities for events without IDs", () => {
    const events = [
      {
        trace_id: "trace-synthetic",
        timestamp: "2026-01-01T00:00:00Z",
        service: "checkout",
        event: "request.started",
      },
      {
        trace_id: "trace-synthetic",
        timestamp: "2026-01-01T00:00:00Z",
        service: "checkout",
        event: "request.started",
      },
    ];

    const first = buildTraceTree(events).all_spans.map((span) => span.id);
    const second = buildTraceTree(events).all_spans.map((span) => span.id);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(events.length);
    expect(first.every((id) => id.startsWith("synthetic_"))).toBe(true);
  });
});
