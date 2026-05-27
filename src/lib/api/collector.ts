import { fetchJSON } from "./client";
import type { CollectorHealth } from "@/types/event";

export async function getCollectorHealth(): Promise<CollectorHealth> {
  return fetchJSON<CollectorHealth>("/status");
}

export async function getCollectorVersion(): Promise<{ version: string; build: string }> {
  return fetchJSON("/version");
}

export async function getCollectorReady(): Promise<{ ready: boolean }> {
  return fetchJSON("/ready");
}
