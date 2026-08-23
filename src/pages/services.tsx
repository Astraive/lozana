import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServiceGraph } from "@/lib/hooks";
import { ServiceTopologyGraph } from "@/components/topology/ServiceTopologyGraph";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Server,
  AlertCircle,
  Search,
  ArrowRight,
  Network,
  RefreshCw,
} from "lucide-react";

export default function ServicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"topology" | "grid">("topology");

  const graphQuery = useServiceGraph();
  const graph = graphQuery.data;
  const filteredServices = (graph?.nodes ?? []).filter((service) =>
    service.name.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Services & Topology Map</h1>
            <p className="text-xs text-muted-foreground">
              Cortex dependency topology and service telemetry reported by the active scope
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md">
            <button
              onClick={() => setActiveTab("topology")}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeTab === "topology" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Topology Graph
            </button>
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeTab === "grid" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Service Cards ({filteredServices.length})
            </button>
          </div>
        </div>
      </div>

      {graphQuery.isLoading ? (
        <Card className="min-h-[420px] bg-card border-border">
          <CardContent className="h-full min-h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <p className="text-sm">Loading service topology from Cortex…</p>
          </CardContent>
        </Card>
      ) : graphQuery.error ? (
        <Card className="min-h-[420px] bg-card border-destructive/40">
          <CardContent className="h-full min-h-[420px] flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Service topology unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cortex did not return a service graph for the active scope.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => graphQuery.refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !graph || graph.nodes.length === 0 ? (
        <Card className="min-h-[420px] bg-card border-border">
          <CardContent className="h-full min-h-[420px] flex flex-col items-center justify-center gap-3 text-center">
            <Network className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">No service topology reported</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Cortex returned no service nodes for the active collector and environment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : activeTab === "topology" ? (
        <ServiceTopologyGraph graph={graph} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((svc) => (
            <Card
              key={svc.id}
              className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group shadow-sm"
              onClick={() =>
                navigate(`/explore?q=${encodeURIComponent(`from events | where service = "${svc.name}" | sort timestamp desc | limit 100`)}`)
              }
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-mono group-hover:text-primary transition-colors">
                      {svc.name}
                    </h3>
                    {svc.version && (
                      <span className="text-[10px] text-muted-foreground font-mono">v{svc.version}</span>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize font-mono ${
                      svc.health === "failing"
                        ? "text-red-400 border-red-500/30 bg-red-500/10"
                        : svc.health === "degraded"
                        ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                        : svc.health === "healthy"
                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {svc.health}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border/50">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-muted-foreground font-semibold block">Throughput</span>
                    <span className="text-xs font-bold font-mono">{svc.request_rate}/s</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-muted-foreground font-semibold block">P95 Latency</span>
                    <span className="text-xs font-bold font-mono">{svc.p95_latency_ms}ms</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase text-muted-foreground font-semibold block">Error Rate</span>
                    <span className={`text-xs font-bold font-mono ${svc.error_rate > 5 ? "text-red-400" : ""}`}>
                      {svc.error_rate}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-primary font-medium group-hover:underline">
                  <span>Explore Wide Events</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredServices.length === 0 && (
            <Card className="col-span-full bg-card border-border">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No reported service matches “{search}”.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
