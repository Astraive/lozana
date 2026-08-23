import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { reconstructIncident, getIncidentGraph } from "@/lib/api/cortex";
import { IncidentWorkbench } from "@/components/cortex/IncidentWorkbench";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, BrainCircuit, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import type { CortexReconstruction, IncidentGraph } from "@/types/cortex";

export default function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlIncidentId = searchParams.get("incident_id")?.trim() ?? "";
  const [syncedIncidentId, setSyncedIncidentId] = useState(urlIncidentId);
  const [incidentIdInput, setIncidentIdInput] = useState(urlIncidentId);
  const [reconstruction, setReconstruction] = useState<CortexReconstruction | null>(null);
  const [graph, setGraph] = useState<IncidentGraph | null>(null);
  const [loading, setLoading] = useState(Boolean(urlIncidentId));
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<"fast" | "deep">("fast");
  const modeRef = useRef(mode);

  const loadIncident = useCallback((
    targetId: string,
    targetMode: "fast" | "deep",
  ) => {
    void Promise.all([
      reconstructIncident(targetId, targetMode),
      getIncidentGraph(targetId),
    ])
      .then(([recData, graphData]) => {
        setReconstruction(recData);
        setGraph(graphData);
        toast.success("Incident reconstructed by Cortex");
      })
      .catch(() => {
        setError(true);
        toast.error("Cortex could not reconstruct this incident");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (syncedIncidentId !== urlIncidentId) {
    setSyncedIncidentId(urlIncidentId);
    setIncidentIdInput(urlIncidentId);
    setReconstruction(null);
    setGraph(null);
    setLoading(Boolean(urlIncidentId));
    setError(false);
  }

  const startReconstruction = (
    targetId: string,
    targetMode: "fast" | "deep" = mode,
  ) => {
    if (!targetId) return;
    setLoading(true);
    setError(false);
    setReconstruction(null);
    setGraph(null);
    void loadIncident(targetId, targetMode);
  };

  useEffect(() => {
    if (urlIncidentId) {
      void loadIncident(urlIncidentId, modeRef.current);
    }
  }, [loadIncident, urlIncidentId]);

  const handleModeChange = (nextMode: "fast" | "deep") => {
    setMode(nextMode);
    modeRef.current = nextMode;
    setIncidentIdInput(urlIncidentId);
    if (urlIncidentId) startReconstruction(urlIncidentId, nextMode);
  };

  const handleSubmit = () => {
    const targetId = incidentIdInput.trim();
    if (!targetId) return;
    if (targetId === urlIncidentId) startReconstruction(targetId);
    else setSearchParams({ incident_id: targetId });
  };

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cortex Autonomous RCA</h1>
            <p className="text-xs text-muted-foreground">
              Incident reconstruction and causal evidence reported by Cortex
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 max-w-md w-full">
          <Input
            value={incidentIdInput}
            onChange={(event) => setIncidentIdInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") handleSubmit(); }}
            placeholder="Incident ID or Trace ID…"
            aria-label="Incident ID or trace ID"
            className="text-xs h-8 font-mono"
          />
          <select
            value={mode}
            onChange={(event) => handleModeChange(event.target.value as "fast" | "deep")}
            aria-label="Reconstruction mode"
            className="h-8 rounded bg-background border border-input px-2 text-xs font-mono"
          >
            <option value="fast">Fast</option>
            <option value="deep">Deep</option>
          </select>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !incidentIdInput.trim()}
            className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
            Reconstruct
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="min-h-[420px] bg-card border-border">
          <CardContent className="min-h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <p className="text-sm">Reconstructing incident from Cortex evidence…</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="min-h-[420px] bg-card border-destructive/40">
          <CardContent className="min-h-[420px] flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Incident reconstruction unavailable</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Cortex returned no reconstruction for this request. Verify the incident ID and active connection, then retry.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => startReconstruction(urlIncidentId)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : reconstruction && graph ? (
        <IncidentWorkbench
          reconstruction={reconstruction}
          incidentGraph={graph}
          onViewTrace={(traceId) => navigate(`/traces?trace_id=${encodeURIComponent(traceId)}`)}
        />
      ) : (
        <Card className="min-h-[420px] bg-card border-border">
          <CardContent className="min-h-[420px] flex flex-col items-center justify-center gap-3 text-center">
            <Search className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Choose an incident to reconstruct</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Enter a real incident or trace ID. Results appear only when Cortex returns reconstruction evidence.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
