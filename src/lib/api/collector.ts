import { fetchJSON } from "./client";
import type { CollectorHealth, SinkHealth } from "@/types/event";
import type { CollectorSchema } from "@/types/cortex";

export async function getCollectorHealth(): Promise<CollectorHealth> {
  return fetchJSON<CollectorHealth>("/status");
}

export async function getCollectorVersion(): Promise<{ version: string; build: string }> {
  return fetchJSON<{ version: string; build: string }>("/version");
}

export async function getCollectorReady(): Promise<{ ready: boolean }> {
  return fetchJSON<{ ready: boolean }>("/ready");
}

export async function getCollectorSchema(): Promise<CollectorSchema> {
  return fetchJSON<CollectorSchema>("/schema");
}

export async function getCollectorSinks(): Promise<{ sinks: SinkHealth[] }> {
  return fetchJSON<{ sinks: SinkHealth[] }>("/sinks");
}
