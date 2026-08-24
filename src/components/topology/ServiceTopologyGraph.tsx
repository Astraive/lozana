import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ServiceGraph, ServiceNode } from "@/types/cortex";

interface ServiceTopologyGraphProps {
  graph: ServiceGraph;
  onSelectService?: (service: ServiceNode) => void;
}

export function ServiceTopologyGraph({
  graph,
  onSelectService,
}: ServiceTopologyGraphProps) {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<ServiceNode | null>(null);

  // Compute 2D node coordinates in a clean radial/layered layout
  const layoutNodes = useMemo(() => {
    const nodes = graph.nodes;
    if (nodes.length === 0) return [];

    const centerX = 350;
    const centerY = 220;
    const radius = Math.min(220, Math.max(120, nodes.length * 28));

    return nodes.map((node, idx) => {
      const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return {
        ...node,
        x,
        y,
      };
    });
  }, [graph.nodes]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, typeof layoutNodes[0]>();
    for (const n of layoutNodes) {
      map.set(n.id, n);
    }
    return map;
  }, [layoutNodes]);

  const handleNodeClick = (node: ServiceNode) => {
    setSelectedNode(node);
    if (onSelectService) onSelectService(node);
  };

  const activeNode = selectedNode || (layoutNodes.length > 0 ? layoutNodes[0] : null);

  const inboundEdges = activeNode
    ? graph.edges.filter((e) => e.target === activeNode.id || e.target === activeNode.name)
    : [];
  const outboundEdges = activeNode
    ? graph.edges.filter((e) => e.source === activeNode.id || e.source === activeNode.name)
    : [];

  const getHealthColor = (health: ServiceNode["health"]) => {
    switch (health) {
      case "healthy":
        return "#10b981"; // emerald
      case "degraded":
        return "#f59e0b"; // amber
      case "failing":
        return "#ef4444"; // red
      default:
        return "#3b82f6"; // blue
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* SVG Canvas */}
      <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[420px] overflow-hidden shadow-sm">
        <div className="absolute top-3 left-3 flex items-center gap-2 text-xs text-muted-foreground z-10">
          <Badge variant="outline" className="text-[10px] font-mono gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {graph.nodes.length} services
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono">
            {graph.edges.length} dependencies
          </Badge>
        </div>

        <svg className="w-full h-full max-w-[700px] max-h-[440px] select-none" viewBox="0 0 700 440">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="18"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
          </defs>

          {/* Directed Edges */}
          {graph.edges.map((edge, idx) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;

            const isHighlighted =
              activeNode &&
              (src.id === activeNode.id || tgt.id === activeNode.id);

            return (
              <g key={idx}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? "#3b82f6" : "#334155"}
                  strokeWidth={isHighlighted ? 2.5 : Math.max(1.2, Math.min(3, edge.call_rate / 20))}
                  strokeDasharray={edge.error_rate > 5 ? "4 3" : undefined}
                  markerEnd="url(#arrowhead)"
                  className="transition-colors duration-300"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map((node) => {
            const isSelected = activeNode?.id === node.id;
            const healthColor = getHealthColor(node.health);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer group"
              >
                {/* Glow ring when selected */}
                {isSelected && (
                  <circle
                    r="30"
                    fill="none"
                    stroke={healthColor}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    className="animate-ping"
                  />
                )}

                {/* Node Circle */}
                <circle
                  r="22"
                  fill="#111827"
                  stroke={healthColor}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all group-hover:scale-110 duration-200"
                />

                {/* Status Dot */}
                <circle cx="12" cy="-12" r="4" fill={healthColor} />

                {/* Service Icon Text */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#f3f4f6"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {node.name.substring(0, 3).toUpperCase()}
                </text>

                {/* Service Label under node */}
                <text
                  textAnchor="middle"
                  dy="36"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="500"
                  className="group-hover:fill-foreground transition-colors"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Service Details Card (Right Sidebar) */}
      <div className="w-full lg:w-80 flex flex-col gap-3">
        {activeNode ? (
          <Card className="bg-card border-border shadow-sm flex-1 flex flex-col">
            <CardContent className="p-4 space-y-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-mono">{activeNode.name}</h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize font-mono"
                      style={{
                        color: getHealthColor(activeNode.health),
                        borderColor: getHealthColor(activeNode.health),
                      }}
                    >
                      {activeNode.health}
                    </Badge>
                  </div>
                  {activeNode.version && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      v{activeNode.version}
                    </span>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5 border border-border/60">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                    Throughput
                  </span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {activeNode.request_rate} <span className="text-[10px] text-muted-foreground font-normal">req/s</span>
                  </span>
                </div>

                <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5 border border-border/60">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                    P95 Latency
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {activeNode.p95_latency_ms} <span className="text-[10px] text-muted-foreground font-normal">ms</span>
                  </span>
                </div>

                <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5 border border-border/60">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                    Error Rate
                  </span>
                  <span
                    className={`text-base font-bold font-mono ${
                      activeNode.error_rate > 5 ? "text-red-400" : "text-foreground"
                    }`}
                  >
                    {activeNode.error_rate}%
                  </span>
                </div>

                <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5 border border-border/60">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                    Total Events
                  </span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {activeNode.event_count >= 1000 ? `${(activeNode.event_count / 1000).toFixed(1)}k` : activeNode.event_count}
                  </span>
                </div>
              </div>

              {/* Inbound & Outbound Connections */}
              <div className="space-y-3 pt-2 border-t border-border/60 flex-1">
                {inboundEdges.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Inbound Callers ({inboundEdges.length})
                    </span>
                    <div className="space-y-1">
                      {inboundEdges.map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono bg-card p-1.5 rounded border border-border/50">
                          <span className="text-primary truncate max-w-[120px]">{e.source}</span>
                          <span className="text-[10px] text-muted-foreground">{e.call_rate} req/s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outboundEdges.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Downstream Calls ({outboundEdges.length})
                    </span>
                    <div className="space-y-1">
                      {outboundEdges.map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono bg-card p-1.5 rounded border border-border/50">
                          <span className="text-purple-400 truncate max-w-[120px]">{e.target}</span>
                          <span className="text-[10px] text-muted-foreground">{e.p95_latency_ms}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`/explore?q=${encodeURIComponent(`from events | where service = "${activeNode.name}" | sort timestamp desc | limit 100`)}`)}
                  className="w-full text-xs gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  Query Service in Explore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/traces?trace_id=&service=${encodeURIComponent(activeNode.name)}`)}
                  className="w-full text-xs gap-1.5"
                >
                  <Activity className="h-3.5 w-3.5" />
                  View Service Traces
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground text-center border border-border rounded-xl">
            Select a service node in the graph to inspect metrics and dependency paths.
          </div>
        )}
      </div>
    </div>
  );
}
