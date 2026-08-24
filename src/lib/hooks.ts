import { useQuery, useMutation } from "@tanstack/react-query";
import { queryLqlEvents, getTraceEvents, getRecentEvents, getEventsOverTime, getTopServices, getTopErrors, getErrorEvents, getEventById } from "@/lib/api/events";
import { getCollectorHealth, getCollectorVersion } from "@/lib/api/collector";
import { getServiceGraph } from "@/lib/api/cortex";
import type { ServiceGraph } from "@/types/cortex";
import type { QueryResult, CollectorHealth } from "@/types/event";
import { scopedQueryKey } from "@/lib/query-client";
import { useAppStore } from "@/stores/app.store";

function useScopedQueryKey(...parts: readonly unknown[]): readonly unknown[] {
  const scopeRevision = useAppStore((state) => state.queryScopeRevision);
  return scopedQueryKey(scopeRevision, ...parts);
}

// ── Events ─────────────────────────────────────────────────────────────────

export function useQueryEvents(
  query: string,
  parameters: Record<string, { type?: string; value: unknown }> = {},
  limit = 1000,
  enabled = true,
) {
  const queryKey = useScopedQueryKey("events", "lql", query, parameters, limit);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => queryLqlEvents(query, parameters, limit),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useRecentEvents(limit = 50) {
  const queryKey = useScopedQueryKey("events", "recent", limit);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getRecentEvents(limit),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useEventsOverTime(intervalMinutes = 5, hours = 24) {
  const queryKey = useScopedQueryKey("events", "over-time", intervalMinutes, hours);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getEventsOverTime(intervalMinutes, hours),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useTopServices(limit = 10) {
  const queryKey = useScopedQueryKey("events", "top-services", limit);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getTopServices(limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useTopErrors(limit = 10) {
  const queryKey = useScopedQueryKey("events", "top-errors", limit);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getTopErrors(limit),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useErrorEvents(limit = 100) {
  const queryKey = useScopedQueryKey("events", "errors", limit);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getErrorEvents(limit),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
}

export function useEventById(eventId: string) {
  const queryKey = useScopedQueryKey("events", "by-id", eventId);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getEventById(eventId),
    enabled: eventId.length > 0,
    staleTime: 60_000,
  });
}

// ── Traces ─────────────────────────────────────────────────────────────────

export function useTraceEvents(traceId: string) {
  const queryKey = useScopedQueryKey("traces", traceId);
  return useQuery<QueryResult>({
    queryKey,
    queryFn: () => getTraceEvents(traceId),
    enabled: traceId.length > 0,
    staleTime: 60_000,
  });
}

// ── Collector ──────────────────────────────────────────────────────────────

export function useCollectorHealth() {
  const queryKey = useScopedQueryKey("collector", "health");
  return useQuery<CollectorHealth>({
    queryKey,
    queryFn: getCollectorHealth,
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 3,
    retryDelay: 2000,
  });
}

export function useCollectorVersion() {
  const queryKey = useScopedQueryKey("collector", "version");
  return useQuery<{ version: string; build: string }>({
    queryKey,
    queryFn: getCollectorVersion,
    staleTime: 300_000,
  });
}

export function useServiceGraph(depth = 2) {
  const queryKey = useScopedQueryKey("cortex", "service-graph", depth);
  return useQuery<ServiceGraph>({
    queryKey,
    queryFn: () => getServiceGraph(undefined, depth),
    staleTime: 30_000,
  });
}

// ── LQL Query ──────────────────────────────────────────────────────────────

export function useLqlQuery() {
  return useMutation({
    mutationFn: async ({
      query,
      parameters = {},
      limit = 1000,
    }: {
      query: string;
      parameters?: Record<string, { type?: string; value: unknown }>;
      limit?: number;
    }) => queryLqlEvents(query, parameters, limit),
  });
}
