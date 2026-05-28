import { useQuery, useMutation } from "@tanstack/react-query";
import { queryEvents, getTraceEvents, getRecentEvents, getEventsOverTime, getTopServices, getTopErrors, getErrorEvents, getEventById } from "@/lib/api/events";
import { getCollectorHealth, getCollectorVersion } from "@/lib/api/collector";
import type { QueryResult, CollectorHealth } from "@/types/event";

// ── Events ─────────────────────────────────────────────────────────────────

export function useQueryEvents(sql: string, enabled = true) {
  return useQuery<QueryResult>({
    queryKey: ["events", "query", sql],
    queryFn: () => queryEvents(sql),
    enabled: enabled && sql.length > 0,
    staleTime: 30_000,
  });
}

export function useRecentEvents(limit = 50) {
  return useQuery<QueryResult>({
    queryKey: ["events", "recent", limit],
    queryFn: () => getRecentEvents(limit),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useEventsOverTime(intervalMinutes = 5, hours = 24) {
  return useQuery<QueryResult>({
    queryKey: ["events", "over-time", intervalMinutes, hours],
    queryFn: () => getEventsOverTime(intervalMinutes, hours),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useTopServices(limit = 10) {
  return useQuery<QueryResult>({
    queryKey: ["events", "top-services", limit],
    queryFn: () => getTopServices(limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useTopErrors(limit = 10) {
  return useQuery<QueryResult>({
    queryKey: ["events", "top-errors", limit],
    queryFn: () => getTopErrors(limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useErrorEvents(limit = 100) {
  return useQuery<QueryResult>({
    queryKey: ["events", "errors", limit],
    queryFn: () => getErrorEvents(limit),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

export function useEventById(eventId: string) {
  return useQuery<QueryResult>({
    queryKey: ["events", "by-id", eventId],
    queryFn: () => getEventById(eventId),
    enabled: eventId.length > 0,
    staleTime: 60_000,
  });
}

// ── Traces ─────────────────────────────────────────────────────────────────

export function useTraceEvents(traceId: string) {
  return useQuery<QueryResult>({
    queryKey: ["traces", traceId],
    queryFn: () => getTraceEvents(traceId),
    enabled: traceId.length > 0,
    staleTime: 60_000,
  });
}

// ── Collector ──────────────────────────────────────────────────────────────

export function useCollectorHealth() {
  return useQuery<CollectorHealth>({
    queryKey: ["collector", "health"],
    queryFn: getCollectorHealth,
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 3,
    retryDelay: 2000,
  });
}

export function useCollectorVersion() {
  return useQuery<{ version: string; build: string }>({
    queryKey: ["collector", "version"],
    queryFn: getCollectorVersion,
    staleTime: 300_000,
  });
}

// ── LQL Query ──────────────────────────────────────────────────────────────

export function useLqlQuery() {
  return useMutation({
    mutationFn: async ({ sql }: { sql: string }) => {
      return queryEvents(sql);
    },
  });
}
