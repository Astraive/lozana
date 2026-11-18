import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  RingBuffer,
  LiveStreamClient,
  buildTailWebSocketUrl,
  buildWebSocketProtocols,
  type StreamStats,
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

  message(data: string): void {
    this.onmessage?.({ data });
  }

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
    expect(buildWebSocketProtocols("lz_sec_live_key")).toEqual([
      "loza.tail.v1",
      "loza.auth.v1.bHpfc2VjX2xpdmVfa2V5",
    ]);
    expect(buildWebSocketProtocols("")).toEqual(["loza.tail.v1"]);
  });

  it.each([
    ["ws://localhost:9308/ws/tail"],
    ["http://localhost:9308/ws/tail"],
  ])("refuses to send the API key over an unencrypted tail (%s)", (wsUrl) => {
    vi.stubGlobal("window", {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    });
    vi.stubGlobal("WebSocket", FakeWebSocket);
    useAppStore.setState({
      wsUrl,
      apiKey: "lz_sec_live_key",
      activeCollector: "local",
      activeEnvironment: "all",
    });
    const client = new LiveStreamClient();
    const errors: Array<string | undefined> = [];
    client.onStatus((status, error) => {
      if (status === "error") errors.push(error);
    });

    client.connect(true);

    // No socket may be opened, so the credential never reaches the wire.
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(client.getStatus()).toBe("error");
    expect(errors[0]).toMatch(/wss|tls/i);
  });

  it("sends the credential only over a TLS-protected (wss://) tail", () => {
    vi.stubGlobal("window", {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    });
    vi.stubGlobal("WebSocket", FakeWebSocket);
    useAppStore.setState({
      wsUrl: "wss://collector.example.com/ws/tail",
      apiKey: "lz_sec_live_key",
      activeCollector: "local",
      activeEnvironment: "all",
    });
    const client = new LiveStreamClient();

    client.connect(true);

    expect(FakeWebSocket.instances).toHaveLength(1);
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toMatch(/^wss:/);
    expect(socket.protocols).toContain("loza.auth.v1.bHpfc2VjX2xpdmVfa2V5");
    client.disconnect();
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

  it("applies changed service and level filters to active WebSocket events", () => {
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
    const socket = FakeWebSocket.instances[0];
    socket.open();
    client.setFilters({ service: "checkout", level: "error" });

    socket.message(
      JSON.stringify({
        event_id: "evt-match",
        timestamp: "2026-08-24T04:10:00Z",
        service: "checkout",
        level: "error",
      })
    );
    socket.message(
      JSON.stringify({
        event_id: "evt-service-miss",
        timestamp: "2026-08-24T04:10:01Z",
        service: "billing",
        level: "error",
      })
    );
    socket.message(
      JSON.stringify({
        event_id: "evt-level-miss",
        timestamp: "2026-08-24T04:10:02Z",
        service: "checkout",
        level: "info",
      })
    );

    expect(client.getEvents().map((event) => event.event_id)).toEqual(["evt-match"]);
    client.disconnect();
  });

  it("reports invalid regex filters without dropping valid events", () => {
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
    const socket = FakeWebSocket.instances[0];
    socket.open();

    expect(client.setFilters({ searchRegex: "[" })).toMatch(/regular expression/i);
    socket.message(
      JSON.stringify({
        event_id: "evt-valid",
        timestamp: "2026-08-24T04:11:00Z",
        service: "checkout",
      })
    );

    expect(client.getEvents().map((event) => event.event_id)).toEqual(["evt-valid"]);
    client.disconnect();
  });
});

function ndjsonResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const encoded = chunks.map((chunk) => encoder.encode(chunk));
  let index = 0;
  const body = {
    getReader() {
      return {
        async read() {
          if (index < encoded.length) {
            return { done: false as const, value: encoded[index++] };
          }
          return { done: true as const, value: undefined };
        },
        cancel() {},
      };
    },
  };
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body,
  } as unknown as Response;
}

describe("NDJSON tail contract", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    });
    useAppStore.setState({
      collectorUrl: "http://localhost:9308",
      wsUrl: "ws://localhost:9308/ws/tail",
      apiKey: "",
      activeCollector: "local",
      activeEnvironment: "all",
    });
  });

  it("processes a trailing NDJSON line without a newline when the stream ends", async () => {
    const first = JSON.stringify({
      event_id: "evt-first",
      timestamp: "2026-08-24T05:00:00Z",
      service: "checkout",
    });
    const last = JSON.stringify({
      event_id: "evt-last",
      timestamp: "2026-08-24T05:00:01Z",
      service: "checkout",
    });
    // The final line has no trailing newline, so it stays in partialChunk until
    // the stream's done signal. It must still be delivered to subscribers.
    vi.stubGlobal("fetch", vi.fn(async () => ndjsonResponse([`${first}\n${last}`])));

    const client = new LiveStreamClient();
    const received: string[] = [];
    client.onEvent((event) => received.push(event.event_id));
    client.connect(false);

    await vi.waitFor(() => {
      expect(received).toEqual(["evt-first", "evt-last"]);
    });
    expect(client.getEvents().map((event) => event.event_id)).toEqual(["evt-first", "evt-last"]);
    client.disconnect();
  });

  it("ignores a whitespace-only trailing fragment without emitting an event", async () => {
    const first = JSON.stringify({
      event_id: "evt-only",
      timestamp: "2026-08-24T05:01:00Z",
    });
    vi.stubGlobal("fetch", vi.fn(async () => ndjsonResponse([`${first}\n   `])));

    const client = new LiveStreamClient();
    client.connect(false);

    await vi.waitFor(() => {
      expect(client.getEvents()).toHaveLength(1);
    });
    expect(client.getEvents().map((event) => event.event_id)).toEqual(["evt-only"]);
    client.disconnect();
  });
});

describe("Live stream buffer capacity stats", () => {
  it("exposes configured capacity separately from the live buffer size and updates it reactively", () => {
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

    const client = new LiveStreamClient(1000);
    const emitted: StreamStats[] = [];
    client.onStats((stats) => emitted.push(stats));

    client.connect(true);
    const socket = FakeWebSocket.instances[0];
    socket.open();

    // Live events make bufferSize diverge from the configured capacity. Before the
    // fix the capacity selector bound to this live count, matching no <option>.
    for (let i = 0; i < 3; i++) {
      socket.message(
        JSON.stringify({
          event_id: `evt-${i}`,
          timestamp: "2026-08-24T04:12:00Z",
          service: "checkout",
        })
      );
    }

    expect(client.getStats().bufferSize).toBe(3);
    // The bound value is a real selector option and is not the live event count.
    expect(client.getStats().bufferCapacity).toBe(1000);

    client.setCapacity(5000);
    expect(client.getStats().bufferCapacity).toBe(5000);
    expect(client.getStats().bufferSize).toBe(3);
    // setCapacity emits stats, so a bound React component re-renders with the new value.
    expect(emitted[emitted.length - 1]?.bufferCapacity).toBe(5000);

    client.disconnect();
  });
});
