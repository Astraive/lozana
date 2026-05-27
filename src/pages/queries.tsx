import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDashboardStore } from "@/stores/dashboard.store";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Play,
  Bookmark,
  Search,
  BookmarkCheck,
} from "lucide-react";

/* -- Page ------------------------------------------------------------------ */

export default function QueriesPage() {
  const { panels, addPanel, removePanel } = useDashboardStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLql, setNewLql] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const handleAdd = () => {
    if (newName.trim() && newLql.trim()) {
      addPanel({
        id: `query-${Date.now()}`,
        title: newName.trim(),
        type: "query",
        query: newLql.trim(),
        position: { x: 0, y: 0, w: 6, h: 4 },
      });
      setNewName("");
      setNewLql("");
      setShowAdd(false);
    }
  };

  const filteredPanels = panels.filter((p) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.query.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved Queries</h1>
          <p className="text-sm text-muted-foreground">
            Reusable LQL queries for quick access
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Save Query
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-accent" />
                Save Query
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Query Name
                </label>
                <Input
                  placeholder="Recent errors"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  LQL Query
                </label>
                <Textarea
                  className="w-full h-24 bg-background border-border font-mono text-sm resize-none focus-visible:ring-primary/30"
                  placeholder='from events | where level = "error" | limit 10'
                  value={newLql}
                  onChange={(e) => setNewLql(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || !newLql.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium w-full"
              >
                Save Query
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* -- Search -------------------------------------------------------- */}
      {panels.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter saved queries..."
            className="h-9 text-sm bg-card border-border pl-9 focus-visible:ring-primary/30"
          />
        </div>
      )}

      {/* -- Queries ------------------------------------------------------- */}
      {panels.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Bookmark className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No saved queries yet
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Save frequently-used LQL queries from the Explore page for quick
              access. Your queries are stored locally in your browser.
            </p>
          </CardContent>
        </Card>
      ) : filteredPanels.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No matching queries
            </p>
            <p className="text-xs text-muted-foreground/60">
              Try adjusting your search filter
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPanels.map((panel, i) => (
            <Card
              key={panel.id}
              className={cn(
                "bg-card border-border hover:border-border/60 transition-all group",
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Index */}
                  <div className="h-8 w-8 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-mono font-bold text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookmarkCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {panel.title}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground block truncate pl-5">
                      {panel.query}
                    </code>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link to={`/explore?q=${encodeURIComponent(panel.query)}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removePanel(panel.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
