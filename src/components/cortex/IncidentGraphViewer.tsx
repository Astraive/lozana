import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit } from "lucide-react";
import type { IncidentGraph, IncidentGraphNode } from "@/types/cortex";

interface IncidentGraphViewerProps {
  graph: IncidentGraph;
  onSelectNode?: (node: IncidentGraphNode) => void;
}

export function IncidentGraphViewer({ graph, onSelectNode }: IncidentGraphViewerProps) {
  const [selectedNode, setSelectedNode] = useState<IncidentGraphNode | null>(null);

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  // Compute layered DAG positions
  const layoutNodes = nodes.map((node, idx) => {
    const total = nodes.length;
    const x = 80 + (idx * 520) / Math.max(1, total - 1);
    const y = 140 + (idx % 2 === 0 ? -40 : 40);
    return {
      ...node,
      x,
      y,
    };
  });

  const nodeMap = new Map<string, typeof layoutNodes[0]>();
  for (const n of layoutNodes) {
    nodeMap.set(n.id, n);
  }

  const handleNodeClick = (node: IncidentGraphNode) => {
    setSelectedNode(node);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-purple-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Causal Chain DAG
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          {nodes.length} causal steps • {edges.length} relations
        </Badge>
      </div>

      <div className="h-72 w-full bg-black/20 rounded-lg border border-border/60 relative overflow-hidden flex items-center justify-center">
        {nodes.length === 0 ? (
          <div className="text-xs text-muted-foreground">No causal DAG available.</div>
        ) : (
          <svg className="w-full h-full select-none" viewBox="0 0 680 280">
            <defs>
              <marker
                id="causal-arrow"
                markerWidth="8"
                markerHeight="6"
                refX="18"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#a855f7" />
              </marker>
            </defs>

            {/* Causal Edges */}
            {edges.map((edge, idx) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              return (
                <g key={idx}>
                  <path
                    d={`M ${src.x} ${src.y} C ${(src.x + tgt.x) / 2} ${src.y}, ${(src.x + tgt.x) / 2} ${tgt.y}, ${tgt.x} ${tgt.y}`}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#causal-arrow)"
                    className="animate-pulse opacity-80"
                  />
                  {/* Relation Label */}
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 8}
                    textAnchor="middle"
                    fill="#c084fc"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {edge.relation} ({Math.round(edge.confidence * 100)}%)
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {layoutNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isCulprit = Boolean(node.is_culprit);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  className="cursor-pointer group"
                >
                  {/* Culprit Ping */}
                  {isCulprit && (
                    <circle
                      r="28"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeOpacity="0.4"
                      className="animate-ping"
                    />
                  )}

                  {/* Node Body */}
                  <rect
                    x="-65"
                    y="-22"
                    width="130"
                    height="44"
                    rx="8"
                    fill="#0f172a"
                    stroke={isCulprit ? "#ef4444" : isSelected ? "#3b82f6" : "#475569"}
                    strokeWidth={isCulprit || isSelected ? 2.5 : 1.5}
                    className="transition-colors group-hover:stroke-purple-400"
                  />

                  {/* Icon & Label */}
                  <text
                    x="0"
                    y="-5"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {node.service}
                  </text>

                  <text
                    x="0"
                    y="10"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {node.label.length > 18 ? `${node.label.substring(0, 16)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
