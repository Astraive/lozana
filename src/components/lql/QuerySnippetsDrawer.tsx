import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PRESET_SNIPPETS, type QuerySnippet } from "@/stores/query.store";
import { Search, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface QuerySnippetsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSnippet: (query: string) => void;
}

export function QuerySnippetsDrawer({
  open,
  onOpenChange,
  onSelectSnippet,
}: QuerySnippetsDrawerProps) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = Array.from(new Set(PRESET_SNIPPETS.map((s) => s.category)));

  const filteredSnippets = PRESET_SNIPPETS.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.query.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const handleCopy = (snippet: QuerySnippet, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.query);
    setCopiedId(snippet.id);
    toast.success("Snippet copied to clipboard");
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            LQL Query Snippets
          </SheetTitle>
          <SheetDescription className="text-xs">
            Curated queries for latency percentiles, error rates, and API triage
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippets..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <div className="space-y-3">
            {categories.map((cat) => {
              const snippetsInCat = filteredSnippets.filter((s) => s.category === cat);
              if (snippetsInCat.length === 0) return null;

              return (
                <div key={cat} className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </span>
                  <div className="space-y-2">
                    {snippetsInCat.map((snippet) => (
                      <div
                        key={snippet.id}
                        onClick={() => {
                          onSelectSnippet(snippet.query);
                          onOpenChange(false);
                        }}
                        className="group border border-border/70 bg-card hover:bg-accent/40 rounded-lg p-3 cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {snippet.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleCopy(snippet, e)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === snippet.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {snippet.description}
                        </p>

                        <div className="bg-muted/40 p-2 rounded text-[10px] font-mono text-muted-foreground overflow-x-auto">
                          <code>{snippet.query}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
