import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  LayoutDashboard,
  Terminal,
  BarChart3,
} from "lucide-react";

/* -- Page ------------------------------------------------------------------ */

export default function DashboardsPage() {
  const { panels, addPanel, removePanel } = useDashboardStore();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLql, setNewLql] = useState("");

  const handleAdd = () => {
    if (newName.trim() && newLql.trim()) {
      addPanel({
        id: `saved-${Date.now()}`,
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

  return (
    <div className="space-y-6">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboards</h1>
          <p className="text-sm text-muted-foreground">
            Custom dashboard panels powered by LQL queries
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Add Panel
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                Add Dashboard Panel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Panel Name
                </label>
                <Input
                  placeholder="Error rate over time"
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
                Save Panel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* -- Panels -------------------------------------------------------- */}
      {panels.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <LayoutDashboard className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No dashboard panels yet
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-sm">
              Add LQL query panels to build your custom dashboard. Each panel
              runs a query and displays results.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {panels.map((panel) => (
            <Card
              key={panel.id}
              className={cn(
                "bg-card border-border hover:border-border/60 transition-all group",
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                        <BarChart3 className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <span className="text-sm font-medium truncate">
                        {panel.title}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground block truncate pl-9">
                      {panel.query}
                    </code>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                    <Terminal className="h-3 w-3" />
                    LQL Panel
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() =>
                        navigate(
                          `/explore?q=${encodeURIComponent(panel.query)}`,
                        )
                      }
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </Button>
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
