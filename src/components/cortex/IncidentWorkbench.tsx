import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IncidentGraphViewer } from "./IncidentGraphViewer";
import { submitRemediationFeedback } from "@/lib/api/cortex";
import {
  BrainCircuit,
  Flame,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Terminal,
  History,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { CortexReconstruction, IncidentGraph } from "@/types/cortex";

interface IncidentWorkbenchProps {
  reconstruction: CortexReconstruction;
  incidentGraph?: IncidentGraph;
  onViewTrace?: (traceId: string) => void;
}

export function IncidentWorkbench({
  reconstruction,
  incidentGraph,
}: IncidentWorkbenchProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "helpful" | "unhelpful">>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleFeedback = async (remediationId: string, vote: "helpful" | "unhelpful") => {
    setFeedbackState((prev) => ({ ...prev, [remediationId]: vote }));
    try {
      await submitRemediationFeedback({
        incident_id: reconstruction.incident_id,
        remediation_id: remediationId,
        vote,
      });
      toast.success(`Feedback recorded: marked as ${vote}`);
    } catch {
      toast.error("Failed to submit feedback to Cortex backend");
    }
  };

  const confidencePct = Math.round(
    reconstruction.confidence <= 1 ? reconstruction.confidence * 100 : reconstruction.confidence
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Incident Radar & Confidence */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/80 bg-gradient-to-r from-purple-950/30 via-card to-card space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs font-mono uppercase px-2 py-0.5 ${
                    reconstruction.severity === "critical"
                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {reconstruction.severity}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {reconstruction.root_cause_service}
                </Badge>
                <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/30 font-mono">
                  {confidencePct}% Confidence
                </Badge>
              </div>

              <h1 className="text-xl font-bold text-foreground">
                {reconstruction.title}
              </h1>

              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Started: {reconstruction.started_at}
                {reconstruction.resolved_at && ` • Resolved: ${reconstruction.resolved_at}`}
              </p>
            </div>

            {/* Confidence Gauge */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-purple-400" />
                <span className="text-2xl font-black font-mono text-purple-400">
                  {confidencePct}%
                </span>
              </div>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Root Cause Summary Box */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <Flame className="h-4 w-4" />
              <span>Identified Root Cause</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {reconstruction.root_cause_summary}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {reconstruction.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Causal Chain Timeline & Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Step-by-Step Causal Chain */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-primary" />
              Causal Chain Timeline ({reconstruction.causal_chain.length} events)
            </h3>
          </div>

          <div className="space-y-3 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
            {reconstruction.causal_chain.map((step, idx) => (
              <div key={step.id || idx} className="flex items-start gap-3 pl-8 relative">
                <div
                  className={`absolute left-2 top-2.5 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                    step.is_root_cause ? "bg-red-500 ring-red-500/30" : "bg-purple-500"
                  }`}
                />

                <Card
                  className={`flex-1 bg-card border transition-all ${
                    step.is_root_cause
                      ? "border-red-500/40 shadow-sm bg-red-500/[0.03]"
                      : "border-border/70"
                  }`}
                >
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {step.service}
                        </Badge>
                        {step.is_root_cause && (
                          <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                            Culprit Root Cause
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {step.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-foreground font-mono leading-relaxed">
                      {step.description}
                    </p>

                    {step.event_id && (
                      <div className="pt-1 flex items-center gap-2">
                        <code className="text-[10px] text-muted-foreground bg-muted/60 px-1 py-0.5 rounded font-mono">
                          {step.event_id}
                        </code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Causal DAG Graph & Symptoms */}
        <div className="lg:col-span-6 space-y-6">
          {/* Causal DAG */}
          {incidentGraph && <IncidentGraphViewer graph={incidentGraph} />}

          {/* Symptoms List */}
          {reconstruction.symptoms && reconstruction.symptoms.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Observed Symptoms ({reconstruction.symptoms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-1.5">
                {reconstruction.symptoms.map((symptom, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono p-2 rounded bg-muted/30 border border-border/40">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>{symptom}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Suggested Remediations & Operator Actions */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Suggested Remediations & Operator Runbook ({reconstruction.remediations.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reconstruction.remediations.map((rem) => {
            const currentVote = feedbackState[rem.id];

            return (
              <Card key={rem.id} className="bg-card border-border shadow-sm space-y-2">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">{rem.action}</CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-mono ${
                        rem.urgency === "immediate"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {rem.urgency}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs leading-relaxed pt-1">
                    {rem.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {rem.command && (
                    <div className="p-2.5 rounded-lg bg-black/40 border border-border flex items-center justify-between gap-2 font-mono text-xs text-foreground">
                      <div className="flex items-center gap-2 overflow-x-auto">
                        <Terminal className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <code className="text-[11px] select-all">{rem.command}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(rem.command!, rem.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                      >
                        {copiedId === rem.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Feedback Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">Was this remediation accurate?</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(rem.id, "helpful")}
                        className={`h-7 text-xs gap-1 ${
                          currentVote === "helpful" ? "text-emerald-400 bg-emerald-500/15" : "text-muted-foreground"
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Helpful
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(rem.id, "unhelpful")}
                        className={`h-7 text-xs gap-1 ${
                          currentVote === "unhelpful" ? "text-red-400 bg-red-500/15" : "text-muted-foreground"
                        }`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Unhelpful
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Similar Historic Incidents */}
      {reconstruction.similar_incidents && reconstruction.similar_incidents.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-purple-400" />
            Similar Historic Incidents ({reconstruction.similar_incidents.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reconstruction.similar_incidents.map((hist) => (
              <div
                key={hist.id}
                className="p-3.5 rounded-lg border border-border bg-card space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground truncate max-w-[200px]">
                    {hist.title}
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono text-purple-400">
                    {Math.round(hist.similarity * 100)}% match
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {hist.resolution_summary}
                </p>
                <span className="text-[10px] text-muted-foreground/60 font-mono block">
                  Resolved: {hist.resolved_at}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
