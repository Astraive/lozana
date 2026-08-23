import { fetchCortexJSON, postCortexJSON } from "./client";
import type {
  CortexReconstruction,
  ServiceGraph,
  IncidentGraph,
  RemediationFeedback,
  IncidentFeedback,
} from "@/types/cortex";

export async function reconstructIncident(
  incidentId: string,
  mode: "fast" | "deep" = "fast"
): Promise<CortexReconstruction> {
  return postCortexJSON<CortexReconstruction>("/reconstruct", {
    incident_id: incidentId,
    mode,
  });
}

export async function getServiceGraph(
  service?: string,
  depth = 2
): Promise<ServiceGraph> {
  const query = service ? `?service=${encodeURIComponent(service)}&depth=${depth}` : `?depth=${depth}`;
  return fetchCortexJSON<ServiceGraph>(`/graph/service${query}`);
}

export async function getIncidentGraph(
  incidentId: string,
  depth = 2
): Promise<IncidentGraph> {
  return fetchCortexJSON<IncidentGraph>(`/graph/incident/${encodeURIComponent(incidentId)}?depth=${depth}`);
}

export async function submitRemediationFeedback(
  feedback: RemediationFeedback
): Promise<{ success: boolean }> {
  return postCortexJSON<{ success: boolean }>("/feedback/remediation", feedback);
}

export async function submitIncidentFeedback(
  feedback: IncidentFeedback
): Promise<{ success: boolean }> {
  return postCortexJSON<{ success: boolean }>("/feedback/incident", feedback);
}

export async function getIncidentsList(
  limit = 20
): Promise<{ incidents: CortexReconstruction[] }> {
  return fetchCortexJSON<{ incidents: CortexReconstruction[] }>(`/incidents?limit=${limit}`);
}
