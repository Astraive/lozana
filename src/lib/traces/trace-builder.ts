import type { LozaEvent, Checkpoint, ProcessStep } from "@/types/event";

export interface TraceSpan {
  id: string;
  span_id: string;
  parent_span_id?: string;
  trace_id: string;
  name: string;
  service: string;
  level: string;
  kind: string;
  outcome: string;
  timestamp: string;
  duration_ms: number;
  start_offset_ms: number;
  depth: number;
  children: TraceSpan[];
  checkpoints: Checkpoint[];
  process: ProcessStep[];
  attrs?: Record<string, unknown>;
  status_code?: number;
  route?: string;
  method?: string;
  error_type?: string;
  error_message?: string;
  error_stack?: string;
  is_critical_path?: boolean;
  service_color?: string;
  rawEvent?: LozaEvent | Record<string, unknown>;
}

export interface ServiceSummary {
  service: string;
  span_count: number;
  duration_ms: number;
  color: string;
}

export interface TraceTree {
  trace_id: string;
  root_spans: TraceSpan[];
  all_spans: TraceSpan[];
  total_duration_ms: number;
  span_count: number;
  service_count: number;
  error_count: number;
  services: ServiceSummary[];
  critical_path_ids: string[];
}

const SERVICE_PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#84cc16", // lime
];

export function getServiceColor(serviceName: string, serviceList: string[]): string {
  const index = serviceList.indexOf(serviceName);
  if (index >= 0) {
    return SERVICE_PALETTE[index % SERVICE_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash << 5) - hash + serviceName.charCodeAt(i);
  }
  return SERVICE_PALETTE[Math.abs(hash) % SERVICE_PALETTE.length];
}

function syntheticSpanKey(event: LozaEvent | Record<string, unknown>, traceId: string): string {
  return [
    traceId,
    event.timestamp,
    event.service,
    event.event,
    event.kind,
    event.parent_span_id,
    event.route,
    event.method,
    event.level,
    event.outcome,
    event.duration_ms,
  ]
    .map((value) => String(value ?? ""))
    .join("\u001f");
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function buildTraceTree(events: (LozaEvent | Record<string, unknown>)[]): TraceTree {
  if (!events || events.length === 0) {
    return {
      trace_id: "",
      root_spans: [],
      all_spans: [],
      total_duration_ms: 0,
      span_count: 0,
      service_count: 0,
      error_count: 0,
      services: [],
      critical_path_ids: [],
    };
  }

  const traceId = String(events[0].trace_id || "");

  // Sort chronologically
  const sorted = [...events].sort((a, b) => {
    const aTime = new Date(String(a.timestamp || 0)).getTime();
    const bTime = new Date(String(b.timestamp || 0)).getTime();
    return aTime - bTime;
  });

  const baseTimestampMs = new Date(String(sorted[0].timestamp || 0)).getTime();

  // Collect distinct services
  const distinctServices = Array.from(
    new Set(sorted.map((e) => String(e.service || "unknown")).filter(Boolean))
  );

  let errorCount = 0;
  const spanMap = new Map<string, TraceSpan>();
  const flatSpans: TraceSpan[] = [];
  const syntheticIdOccurrences = new Map<string, number>();

  for (const evt of sorted) {
    let spanId = String(evt.span_id || evt.event_id || "");
    if (!spanId) {
      const baseId = `synthetic_${stableHash(syntheticSpanKey(evt, traceId))}`;
      const occurrence = syntheticIdOccurrences.get(baseId) ?? 0;
      syntheticIdOccurrences.set(baseId, occurrence + 1);
      spanId = occurrence === 0 ? baseId : `${baseId}_${occurrence}`;
    }
    const parentSpanId = evt.parent_span_id ? String(evt.parent_span_id) : undefined;
    const service = String(evt.service || "unknown");
    const level = String(evt.level || "info").toLowerCase();
    const timestampStr = String(evt.timestamp || "");
    const evtTimeMs = new Date(timestampStr).getTime();
    const startOffsetMs = Math.max(0, evtTimeMs - baseTimestampMs);
    const durationMs = Math.max(
      1,
      typeof evt.duration_ms === "number" ? evt.duration_ms : 10
    );

    if (level === "error" || level === "fatal") {
      errorCount++;
    }

    const span: TraceSpan = {
      id: spanId,
      span_id: spanId,
      parent_span_id: parentSpanId,
      trace_id: traceId,
      name: String(evt.event || evt.route || evt.method || "span"),
      service,
      level,
      kind: String(evt.kind || "span"),
      outcome: String(evt.outcome || "success"),
      timestamp: timestampStr,
      duration_ms: durationMs,
      start_offset_ms: startOffsetMs,
      depth: 0,
      children: [],
      checkpoints: Array.isArray(evt.checkpoints) ? evt.checkpoints : [],
      process: Array.isArray(evt.process) ? evt.process : [],
      attrs: evt.attrs && typeof evt.attrs === "object" ? (evt.attrs as Record<string, unknown>) : undefined,
      status_code: typeof evt.status_code === "number" ? evt.status_code : undefined,
      route: evt.route ? String(evt.route) : undefined,
      method: evt.method ? String(evt.method) : undefined,
      error_type: evt.error_type ? String(evt.error_type) : undefined,
      error_message: evt.error_message ? String(evt.error_message) : undefined,
      error_stack: evt.error_stack ? String(evt.error_stack) : undefined,
      service_color: getServiceColor(service, distinctServices),
      rawEvent: evt,
    };

    spanMap.set(spanId, span);
    flatSpans.push(span);
  }

  // Build Hierarchy
  const rootSpans: TraceSpan[] = [];

  for (const span of flatSpans) {
    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      const parent = spanMap.get(span.parent_span_id)!;
      parent.children.push(span);
    } else {
      rootSpans.push(span);
    }
  }

  // If no parent hierarchy was declared, nest child spans based on service call chronology
  if (rootSpans.length === flatSpans.length && flatSpans.length > 1) {
    const root = flatSpans[0];
    rootSpans.length = 0;
    rootSpans.push(root);
    for (let i = 1; i < flatSpans.length; i++) {
      root.children.push(flatSpans[i]);
    }
  }

  // Compute depths recursively
  function assignDepth(span: TraceSpan, currentDepth: number) {
    span.depth = currentDepth;
    for (const child of span.children) {
      assignDepth(child, currentDepth + 1);
    }
  }

  for (const root of rootSpans) {
    assignDepth(root, 0);
  }

  // Calculate total trace duration
  let maxEndTime = 0;
  for (const s of flatSpans) {
    const endTime = s.start_offset_ms + s.duration_ms;
    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }
  }
  const totalDurationMs = Math.max(1, maxEndTime);

  // Compute Critical Path
  const criticalPathIds: string[] = [];

  function findCriticalPath(span: TraceSpan) {
    criticalPathIds.push(span.id);
    span.is_critical_path = true;

    if (span.children.length === 0) return;

    // Find child that completes latest or takes the most duration
    let longestChild: TraceSpan | null = null;
    let maxChildDuration = -1;

    for (const child of span.children) {
      if (child.duration_ms > maxChildDuration) {
        maxChildDuration = child.duration_ms;
        longestChild = child;
      }
    }

    if (longestChild) {
      findCriticalPath(longestChild);
    }
  }

  if (rootSpans.length > 0) {
    findCriticalPath(rootSpans[0]);
  }

  // Compute Service Summaries
  const serviceDurations: Record<string, { count: number; duration: number }> = {};
  for (const s of flatSpans) {
    if (!serviceDurations[s.service]) {
      serviceDurations[s.service] = { count: 0, duration: 0 };
    }
    serviceDurations[s.service].count++;
    serviceDurations[s.service].duration += s.duration_ms;
  }

  const services: ServiceSummary[] = distinctServices.map((svc) => ({
    service: svc,
    span_count: serviceDurations[svc]?.count || 1,
    duration_ms: serviceDurations[svc]?.duration || 0,
    color: getServiceColor(svc, distinctServices),
  }));

  return {
    trace_id: traceId,
    root_spans: rootSpans,
    all_spans: flatSpans,
    total_duration_ms: totalDurationMs,
    span_count: flatSpans.length,
    service_count: distinctServices.length,
    error_count: errorCount,
    services,
    critical_path_ids: criticalPathIds,
  };
}
