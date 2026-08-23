import { useState } from "react";
import { useQueryEvents } from "@/lib/hooks";
import { useDashboardStore } from "@/stores/dashboard.store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Panel } from "@/types/dashboard";
import type { QueryResult } from "@/types/event";

interface PanelWrapperProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
  children: (data: QueryResult | undefined, isLoading: boolean, error: Error | null) => React.ReactNode;
}

export function PanelWrapper({
  panel,
  onEdit,
  onDelete,
  onDuplicate,
  children,
}: PanelWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const interpolateQuery = useDashboardStore((s) => s.interpolateQuery);
  const isEditingLayout = useDashboardStore((s) => s.isEditingLayout);

  const finalQuery = interpolateQuery(panel.query);
  const queryResult = useQueryEvents(finalQuery, {}, 500, Boolean(panel.query && panel.type !== "markdown"));

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <Card
      className={`bg-card border-border flex flex-col overflow-hidden transition-all shadow-sm ${
        isFullscreen
          ? "fixed inset-4 z-50 shadow-2xl ring-2 ring-primary bg-card/95 backdrop-blur"
          : "h-full w-full"
      } ${isEditingLayout ? "ring-1 ring-primary/40" : ""}`}
    >
      <CardHeader className="p-3 pb-2 flex-shrink-0 flex flex-row items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <CardTitle className="text-xs font-semibold tracking-tight text-foreground truncate" title={panel.title}>
            {panel.title}
          </CardTitle>
          {panel.description && (
            <span className="text-[10px] text-muted-foreground truncate hidden sm:inline" title={panel.description}>
              — {panel.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {queryResult.data?.duration_ms !== undefined && (
            <span className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-0.5 mr-1">
              <Zap className="h-2.5 w-2.5 text-amber-400" />
              {queryResult.data.duration_ms}ms
            </span>
          )}

          {queryResult.isFetching && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground mr-1" />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>

          {(onEdit || onDelete || onDuplicate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(panel)} className="gap-2">
                    <Edit2 className="h-3 w-3" /> Edit Panel
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(panel.id)} className="gap-2">
                    <Copy className="h-3 w-3" /> Duplicate
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(panel.id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-auto flex flex-col">
        {queryResult.error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs font-mono">{queryResult.error.message}</p>
          </div>
        ) : (
          children(queryResult.data, queryResult.isLoading, queryResult.error)
        )}
      </CardContent>
    </Card>
  );
}
