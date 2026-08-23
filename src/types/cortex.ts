export interface CortexReconstruction {
  incident_id: string;
  title: string;
  confidence: number;
  summary: string;
  root_cause_service: string;
  root_cause_summary: string;
  started_at: string;
  resolved_at?: string;
  severity: "low" | "medium" | "high" | "critical";
  causal_chain: CausalChainStep[];
  symptoms: string[];
  affected_services: string[];
  similar_incidents: SimilarIncident[];
  remediations: RemediationSuggestion[];
  timeline: TimelineEvent[];
}

export interface CausalChainStep {
  id: string;
  service: string;
  timestamp: string;
  description: string;
  event_id?: string;
  is_root_cause?: boolean;
  confidence?: number;
  metrics?: Record<string, unknown>;
}

export interface SimilarIncident {
  id: string;
  title: string;
  resolved_at: string;
  similarity: number;
  resolution_summary: string;
}

export interface RemediationSuggestion {
  id: string;
  action: string;
  description: string;
  command?: string;
  urgency: "immediate" | "recommended" | "optional";
  automated_supported: boolean;
  feedback?: "helpful" | "unhelpful";
}

export interface TimelineEvent {
  timestamp: string;
  service: string;
  event: string;
  level: "debug" | "info" | "notice" | "warn" | "error" | "fatal";
  message?: string;
  event_id?: string;
}

export interface ServiceGraph {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}

export interface ServiceNode {
  id: string;
  name: string;
  version?: string;
  health: "healthy" | "degraded" | "failing" | "unknown";
  request_rate: number;
  error_rate: number;
  p95_latency_ms: number;
  event_count: number;
}

export interface ServiceEdge {
  source: string;
  target: string;
  call_rate: number;
  error_rate: number;
  p95_latency_ms: number;
}

export interface IncidentGraph {
  incident_id: string;
  nodes: IncidentGraphNode[];
  edges: IncidentGraphEdge[];
}

export interface IncidentGraphNode {
  id: string;
  label: string;
  service: string;
  type: "event" | "metric_anomaly" | "state_change" | "checkpoint_delay";
  timestamp: string;
  level?: string;
  is_culprit?: boolean;
  event_id?: string;
}

export interface IncidentGraphEdge {
  source: string;
  target: string;
  relation: "caused" | "preceded" | "triggered" | "correlated";
  confidence: number;
}

export interface RemediationFeedback {
  remediation_id: string;
  incident_id: string;
  vote: "helpful" | "unhelpful";
  comment?: string;
}

export interface IncidentFeedback {
  incident_id: string;
  accurate: boolean;
  actual_root_cause?: string;
  notes?: string;
}

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "timestamp" | "object" | "array";
  description?: string;
  is_indexed?: boolean;
  cardinality_hint?: "low" | "medium" | "high";
}

export interface CollectorSchema {
  fields: SchemaField[];
  custom_attributes: string[];
}
