import { PanelWrapper } from "./PanelWrapper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Panel } from "@/types/dashboard";

interface TablePanelProps {
  panel: Panel;
  onEdit?: (panel: Panel) => void;
  onDelete?: (panelId: string) => void;
  onDuplicate?: (panelId: string) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function TablePanel({ panel, onEdit, onDelete, onDuplicate, onRowClick }: TablePanelProps) {
  return (
    <PanelWrapper panel={panel} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate}>
      {(data, isLoading) => {
        if (isLoading) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          );
        }

        const rows = data?.rows ?? [];
        const columns = data?.columns ?? (rows.length > 0 ? Object.keys(rows[0]) : []);

        if (rows.length === 0) {
          return (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              No tabular data found.
            </div>
          );
        }

        const visibleCols = columns.slice(0, 6);

        return (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <TableRow className="border-b border-border/70 hover:bg-transparent">
                  {visibleCols.map((col) => (
                    <TableHead key={col} className="text-[11px] font-semibold py-1.5 px-2">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((r, idx) => (
                  <TableRow
                    key={idx}
                    onClick={() => onRowClick && onRowClick(r)}
                    className="border-b border-border/40 hover:bg-accent/40 cursor-pointer text-xs"
                  >
                    {visibleCols.map((col) => {
                      const val = r[col];
                      return (
                        <TableCell key={col} className="py-1.5 px-2 font-mono text-[11px] truncate max-w-[150px]">
                          {col === "level" ? (
                            <Badge
                              variant="outline"
                              className={`text-[9px] uppercase px-1 py-0 ${
                                String(val) === "error" || String(val) === "fatal"
                                  ? "text-red-400 border-red-500/30"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {String(val)}
                            </Badge>
                          ) : val !== undefined && val !== null ? (
                            String(val)
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }}
    </PanelWrapper>
  );
}
