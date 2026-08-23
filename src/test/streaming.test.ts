import { afterEach, describe, it, expect, vi } from "vitest";
import {
  RingBuffer,
  LiveStreamClient,
  buildTailWebSocketUrl,
  buildWebSocketProtocols,
} from "@/lib/api/streaming";
import { useAppStore } from "@/stores/app.store";

describe("Streaming RingBuffer", () => {
  it("pushes items up to capacity without dropping", () => {
    const ring = new RingBuffer<string>(5);
    expect(ring.getSize()).toBe(0);

    const dropped1 = ring.push("item-1");
    const dropped2 = ring.push("item-2");
    const dropped3 = ring.push("item-3");

    expect(dropped1).toBe(false);
    expect(dropped2).toBe(false);
    expect(dropped3).toBe(false);
    expect(ring.getSize()).toBe(3);
    expect(ring.toArray()).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("overwrites oldest item when full and reports dropped=true", () => {
    const ring = new RingBuffer<number>(3);
    ring.push(1);
    ring.push(2);
    ring.push(3);

    expect(ring.getSize()).toBe(3);
    expect(ring.toArray()).toEqual([1, 2, 3]);

    const dropped = ring.push(4);
    expect(dropped).toBe(true);
    expect(ring.getSize()).toBe(3);
    expect(ring.toArray()).toEqual([2, 3, 4]);

    ring.push(5);
    expect(ring.toArray()).toEqual([3, 4, 5]);
  });

  it("resizes capacity preserving latest items", () => {
    const ring = new RingBuffer<string>(3);
    ring.push("a");
    ring.push("b");
    ring.push("c");

    ring.setCapacity(5);
    expect(ring.getCapacity()).toBe(5);
    expect(ring.getSize()).toBe(3);
    expect(ring.toArray()).toEqual(["a", "b", "c"]);

    ring.push("d");
    ring.push("e");
    expect(ring.toArray()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("clears all items cleanly", () => {
    const ring = new RingBuffer<string>(5);
    ring.push("x");
    ring.push("y");

    ring.clear();
    expect(ring.getSize()).toBe(0);
    expect(ring.toArray()).toEqual([]);
  });
});

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(
    readonly url: string,
    readonly protocols: string[]
  ) {
    FakeWebSocket.instances.push(this);
  }

  close(): void {}

  open(): void {
    this.onopen?.();
  }

  closeFromServer(): void {
    this.onclose?.();
  }
}

afterEach(() => {
  FakeWebSocket.instances = [];
  vi.unstubAllGlobals();
});

describe("WebSocket tail contract", () => {
  it("uses the configured endpoint with canonical scoped routing and request metadata", () => {
    expect(
      buildTailWebSocketUrl(
        "ws://localhost:9308/tail",
        "edge/us",
        "production",
        { service: "checkout", kind: "log" }
      )
    ).toBe(
      "ws://localhost:9308/collectors/edge%2Fus/ws/tail?service=checkout&kind=log&environment=production"
    );
  });

  it("transports credentials in a non-echoed WebSocket subprotocol", () => {
    expect(buildWebSocketProtocols("lx_sec_live_key")).toEqual([
      "loza.tail.v1",
      "loza.auth.v1.bHhfc2VjX2xpdmVfa2V5",
    ]);
    expect(buildWebSocketProtocols("")).toEqual(["loza.tail.v1"]);
  });

  it("ignores close callbacks from a replaced WebSocket", () => {
    vi.stubGlobal("window", {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    });
    vi.stubGlobal("WebSocket", FakeWebSocket);
    useAppStore.setState({
      wsUrl: "ws://localhost:9308/ws/tail",
      apiKey: "",
      activeCollector: "local",
      activeEnvironment: "all",
    });
    const client = new LiveStreamClient();

    client.connect(true);
    const first = FakeWebSocket.instances[0];
    first.open();
    client.connect(true);
    const second = FakeWebSocket.instances[1];
    second.open();
    first.closeFromServer();

    expect(client.getStatus()).toBe("connected");
    client.disconnect();
  });
});
