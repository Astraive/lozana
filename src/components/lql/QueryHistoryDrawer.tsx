import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryStore } from "@/stores/query.store";
import { History, Trash2, Search, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QueryHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectQuery: (query: string) => void;
}

export function QueryHistoryDrawer({
  open,
  onOpenChange,
  onSelectQuery,
}: QueryHistoryDrawerProps) {
  const { history, clearHistory } = useQueryStore();
  const [search, setSearch] = useState("");

  const filteredHistory = history.filter((h) =>
    h.query.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Query History
            </SheetTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Recent LQL queries executed in this browser session
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="pl-8 text-xs h-8"
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No queries recorded in history yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectQuery(item.query);
                    onOpenChange(false);
                  }}
                  className="border border-border/70 bg-card hover:bg-accent/40 rounded-lg p-3 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.executedAt), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.error ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1 gap-0.5">
                          <XCircle className="h-2.5 w-2.5" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 text-emerald-500 border-emerald-500/30">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {item.rowCount} rows
                        </Badge>
                      )}
                      <span className="text-[10px] font-mono">{item.durationMs}ms</span>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-2 rounded text-[11px] font-mono text-foreground overflow-x-auto group-hover:border group-hover:border-primary/30 transition-colors">
                    <code>{item.query}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
