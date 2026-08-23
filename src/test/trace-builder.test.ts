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
