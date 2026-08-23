import {
  getCollectorUrl,
  getWebSocketUrl,
  getApiKey,
  getActiveEnvironment,
  getActiveCollector,
} from "./client";
import type { LozaEvent } from "@/types/event";

export type StreamConnectionStatus =
  | "connecting"
  | "connected"
  | "paused"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface StreamFilterOptions {
  service?: string;
  kind?: string;
  level?: string;
  trace_id?: string;
  incident_id?: string;
  searchRegex?: string;
}

export interface StreamStats {
  eventsReceived: number;
  eventsPerSecond: number;
  bytesReceived: number;
  bufferSize: number;
  droppedCount: number;
  connectedSince?: Date;
}

export type StreamEventCallback = (event: LozaEvent) => void;
export type StreamStatusCallback = (status: StreamConnectionStatus, error?: string) => void;
export type StreamStatsCallback = (stats: StreamStats) => void;

const TAIL_WEBSOCKET_PROTOCOL = "loza.tail.v1";
const AUTH_WEBSOCKET_PROTOCOL_PREFIX = "loza.auth.v1.";

export function buildWebSocketProtocols(credential: string): string[] {
  if (!credential) return [TAIL_WEBSOCKET_PROTOCOL];
  const bytes = new TextEncoder().encode(credential);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return [TAIL_WEBSOCKET_PROTOCOL, `${AUTH_WEBSOCKET_PROTOCOL_PREFIX}${encoded}`];
}

export function buildTailWebSocketUrl(
  configuredUrl: string,
  collector: string,
  environment: string,
  filters: StreamFilterOptions
): string {
  const url = new URL(configuredUrl);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("WebSocket URL must use ws, wss, http, or https");
  }

  let prefix = url.pathname.replace(/\/+$/, "");
  for (const suffix of ["/ws/tail", "/tail", "/ws"]) {
    if (prefix.endsWith(suffix)) {
      prefix = prefix.slice(0, -suffix.length);
      break;
    }
  }
  const tailPath = collector
    ? `/collectors/${encodeURIComponent(collector)}/ws/tail`
    : "/ws/tail";
  url.pathname = `${prefix}${tailPath}`.replace(/\/{2,}/g, "/");

  for (const name of ["service", "kind", "level", "trace_id", "incident_id", "environment"]) {
    url.searchParams.delete(name);
  }
  for (const [name, value] of Object.entries(filters)) {
    if (name !== "searchRegex" && value) url.searchParams.set(name, value);
  }
  if (environment && environment !== "all") {
    url.searchParams.set("environment", environment);
  }
  return url.toString();
}

export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private capacity: number;
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(capacity = 1000) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array(this.capacity);
  }

  push(item: T): boolean {
    let dropped = false;
    if (this.size === this.capacity) {
      // Overwrite oldest item at head
      this.head = (this.head + 1) % this.capacity;
      dropped = true;
    } else {
      this.size++;
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    return dropped;
  }

  toArray(): T[] {
    const result: T[] = [];
    let idx = this.head;
    for (let i = 0; i < this.size; i++) {
      const item = this.buffer[idx];
      if (item !== undefined) {
        result.push(item);
      }
      idx = (idx + 1) % this.capacity;
    }
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  setCapacity(newCapacity: number): void {
    const items = this.toArray();
    this.capacity = Math.max(1, newCapacity);
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    for (const item of items.slice(-this.capacity)) {
      this.push(item);
    }
  }

  getSize(): number {
    return this.size;
  }

  getCapacity(): number {
    return this.capacity;
  }
}

export class LiveStreamClient {
  private status: StreamConnectionStatus = "disconnected";
  private ringBuffer: RingBuffer<LozaEvent>;
  private abortController: AbortController | null = null;
  private ws: WebSocket | null = null;
  private filters: StreamFilterOptions = {};
  private paused = false;

  private stats: StreamStats = {
    eventsReceived: 0,
    eventsPerSecond: 0,
    bytesReceived: 0,
    bufferSize: 0,
    droppedCount: 0,
  };

  private secondWindowEvents = 0;
  private speedIntervalTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private useWebSocket = false;

  private eventListeners = new Set<StreamEventCallback>();
  private statusListeners = new Set<StreamStatusCallback>();
  private statsListeners = new Set<StreamStatsCallback>();

  constructor(bufferCapacity = 1000) {
    this.ringBuffer = new RingBuffer<LozaEvent>(bufferCapacity);
  }

  public getStatus(): StreamConnectionStatus {
    return this.status;
  }

  public getEvents(): LozaEvent[] {
    return this.ringBuffer.toArray();
  }

  public getStats(): StreamStats {
    return {
      ...this.stats,
      bufferSize: this.ringBuffer.getSize(),
    };
  }

  public setCapacity(capacity: number): void {
    this.ringBuffer.setCapacity(capacity);
    this.emitStats();
  }

  public setFilters(filters: StreamFilterOptions): void {
    this.filters = { ...filters };
  }

  public onEvent(cb: StreamEventCallback): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  public onStatus(cb: StreamStatusCallback): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  public onStats(cb: StreamStatsCallback): () => void {
    this.statsListeners.add(cb);
    return () => this.statsListeners.delete(cb);
  }

  private setStatus(status: StreamConnectionStatus, error?: string): void {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status, error));
  }

  private emitStats(): void {
    const currentStats = this.getStats();
    this.statsListeners.forEach((cb) => cb(currentStats));
  }

  public startSpeedMeter(): void {
    if (this.speedIntervalTimer !== null) return;
    this.speedIntervalTimer = window.setInterval(() => {
      this.stats.eventsPerSecond = this.secondWindowEvents;
      this.secondWindowEvents = 0;
      this.emitStats();
    }, 1000);
  }

  public stopSpeedMeter(): void {
    if (this.speedIntervalTimer !== null) {
      window.clearInterval(this.speedIntervalTimer);
      this.speedIntervalTimer = null;
    }
  }

  public pause(): void {
    if (this.status === "connected") {
      this.paused = true;
      this.setStatus("paused");
    }
  }

  public resume(): void {
    if (this.status === "paused") {
      this.paused = false;
      this.setStatus("connected");
    }
  }

  public clearBuffer(): void {
    this.ringBuffer.clear();
    this.emitStats();
  }

  public connect(useWebSocket = false): void {
    this.disconnect();
    this.useWebSocket = useWebSocket;
    this.paused = false;
    this.startSpeedMeter();

    if (useWebSocket) {
      this.connectWebSocket();
    } else {
      this.connectNdjson();
    }
  }

  private connectNdjson(): void {
    this.setStatus("connecting");
    const controller = new AbortController();
    this.abortController = controller;

    const baseUrl = getCollectorUrl().replace(/\/+$/, "");
    const collector = getActiveCollector();
    const env = getActiveEnvironment();
    const key = getApiKey();

    const params = new URLSearchParams();
    if (this.filters.service) params.set("service", this.filters.service);
    if (this.filters.kind) params.set("kind", this.filters.kind);
    if (this.filters.level) params.set("level", this.filters.level);
    if (this.filters.trace_id) params.set("trace_id", this.filters.trace_id);
    if (this.filters.incident_id) params.set("incident_id", this.filters.incident_id);

    const basePath = collector ? `/collectors/${encodeURIComponent(collector)}/tail` : "/tail";
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${baseUrl}${basePath}${queryString}`;

    const headers: Record<string, string> = {
      Accept: "application/x-ndjson, text/event-stream, */*",
    };
    if (key) headers["Authorization"] = `Bearer ${key}`;
    if (env && env !== "all") headers["X-Loza-Env"] = env;
    if (collector) headers["X-Loza-Collector"] = collector;

    fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (this.abortController !== controller) return;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error("No response body available for streaming");
        }

        this.reconnectAttempts = 0;
        this.stats.connectedSince = new Date();
        this.setStatus("connected");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialChunk = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            this.stats.bytesReceived += value.byteLength;
            const text = decoder.decode(value, { stream: true });
            partialChunk += text;

            const lines = partialChunk.split("\n");
            partialChunk = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              this.processRawLine(trimmed);
            }
          }
        }

        if (this.abortController === controller && !controller.signal.aborted) {
          this.scheduleReconnect();
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || this.abortController !== controller) {
          return;
        }
        const msg = err instanceof Error ? err.message : "Stream connection error";
        this.setStatus("error", msg);
        this.scheduleReconnect();
      });
  }

  private connectWebSocket(): void {
    this.setStatus("connecting");
    const collector = getActiveCollector();
    const environment = getActiveEnvironment();

    try {
      const url = buildTailWebSocketUrl(
        getWebSocketUrl(),
        collector,
        environment,
        this.filters
      );
      const socket = new WebSocket(url, buildWebSocketProtocols(getApiKey()));
      this.ws = socket;
      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.reconnectAttempts = 0;
        this.stats.connectedSince = new Date();
        this.setStatus("connected");
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        if (typeof event.data === "string") {
          this.stats.bytesReceived += event.data.length;
          this.processRawLine(event.data);
        }
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.setStatus("error", "WebSocket connection error");
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.ws = null;
        if (this.status !== "disconnected") {
          this.scheduleReconnect();
        }
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "WebSocket initialization error";
      this.setStatus("error", msg);
      this.scheduleReconnect();
    }
  }

  private processRawLine(line: string): void {
    try {
      const event = JSON.parse(line) as LozaEvent;
      if (!event.event_id || !event.timestamp) {
        return;
      }

      // Check client-side regex filter if set
      if (this.filters.searchRegex) {
        const regex = new RegExp(this.filters.searchRegex, "i");
        const matches = regex.test(JSON.stringify(event));
        if (!matches) return;
      }

      this.stats.eventsReceived++;
      this.secondWindowEvents++;

      if (!this.paused) {
        const wasDropped = this.ringBuffer.push(event);
        if (wasDropped) {
          this.stats.droppedCount++;
        }
        this.eventListeners.forEach((cb) => cb(event));
      }
    } catch {
      // Ignored malformed stream line
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus("disconnected", "Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    this.setStatus("reconnecting");

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.useWebSocket);
    }, backoffMs);
  }

  public disconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      socket.close();
    }
    this.stopSpeedMeter();
    this.setStatus("disconnected");
  }
}
