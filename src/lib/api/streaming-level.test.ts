// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  getCollectorUrl: () => "http://localhost:9308",
  getWebSocketUrl: () => "ws://localhost:9308/ws/tail",
  getApiKey: () => "",
  getActiveEnvironment: () => "all",
  getActiveCollector: () => "",
}));

import {
  buildTailWebSocketUrl,
  LiveStreamClient,
  matchesStreamLevel,
  shouldReconnectForFilters,
} from "./streaming";

class FixtureSocket {
  static sockets: FixtureSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FixtureSocket.sockets.push(this);
  }

  close() {}

  emit(id: string, level: string) {
    this.onmessage?.({
      data: JSON.stringify({
        event_id: id,
        timestamp: "2026-11-20T00:00:00Z",
        service: "checkout",
        event: id,
        level,
      }),
    });
  }
}

const clients: LiveStreamClient[] = [];
const openStream = (level?: string) => {
  const client = new LiveStreamClient(10);
  clients.push(client);
  client.setFilters({ level });
  client.connect(true);
  const socket = FixtureSocket.sockets.at(-1)!;
  socket.onopen?.();
  return { client, socket };
};

beforeEach(() => {
  FixtureSocket.sockets = [];
  vi.stubGlobal("WebSocket", FixtureSocket);
});

afterEach(() => {
  for (const client of clients.splice(0)) client.disconnect();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("live tail combined severity selection", () => {
  it("preserves ordinary error-only and all-levels matching", () => {
    expect(matchesStreamLevel(undefined, "fatal")).toBe(true);
    expect(matchesStreamLevel("error", "error")).toBe(true);
    expect(matchesStreamLevel("error", "fatal")).toBe(false);
    expect(matchesStreamLevel("warn", "warn")).toBe(true);
    expect(matchesStreamLevel("warn", "fatal")).toBe(false);
  });

  it("matches only error and fatal for the combined option", () => {
    for (const level of ["error", "fatal"]) {
      expect(matchesStreamLevel("error-fatal", level)).toBe(true);
    }
    for (const level of ["debug", "info", "notice", "warn"]) {
      expect(matchesStreamLevel("error-fatal", level)).toBe(false);
    }
  });

  it("omits the unsupported combined severity from the server URL", () => {
    const base = "ws://localhost:9308/ws/tail";
    const grouped = new URL(buildTailWebSocketUrl(base, "", "all", { level: "error-fatal" }));
    expect(grouped.searchParams.has("level")).toBe(false);
    const single = new URL(buildTailWebSocketUrl(base, "", "all", { level: "warn" }));
    expect(single.searchParams.get("level")).toBe("warn");
  });

  it("omits the combined severity from the NDJSON request URL", () => {
    const requestUrls: string[] = [];
    vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
      requestUrls.push(String(input));
      return new Promise<Response>(() => {});
    });

    const client = new LiveStreamClient(10);
    clients.push(client);
    client.setFilters({ level: "error-fatal" });
    client.connect();
    expect(new URL(requestUrls[0]!).searchParams.has("level")).toBe(false);

    client.setFilters({ level: "warn" });
    client.reconnect();
    expect(new URL(requestUrls[1]!).searchParams.get("level")).toBe("warn");
  });

  it("keeps fatal events that arrive after selecting the combined level", () => {
    const { client, socket } = openStream("error-fatal");
    expect(new URL(socket.url).searchParams.has("level")).toBe(false);
    socket.emit("error", "error");
    socket.emit("fatal", "fatal");
    socket.emit("info", "info");
    expect(client.getEvents().map((event) => event.event_id)).toEqual(["error", "fatal"]);
  });

  it("preserves buffered history and new fatal events after reconnect", () => {
    const { client, socket } = openStream();
    socket.emit("before-info", "info");
    socket.emit("before-fatal", "fatal");
    expect(shouldReconnectForFilters({ level: undefined }, { level: "error-fatal" })).toBe(true);
    client.setFilters({ level: "error-fatal" });
    client.reconnect();
    const next = FixtureSocket.sockets.at(-1)!;
    expect(next).not.toBe(socket);
    next.onopen?.();
    next.emit("after-fatal", "fatal");
    next.emit("after-info", "info");
    expect(client.getEvents().map((event) => event.event_id)).toEqual([
      "before-info", "before-fatal", "after-fatal",
    ]);
  });
});
