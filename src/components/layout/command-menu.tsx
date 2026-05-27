import { useEffect, useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/cn"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Search,
  LayoutDashboard,
  GitBranch,
  AlertTriangle,
  Server,
  LayoutGrid,
  ListChecks,
  Bell,
  Activity,
  Settings,
} from "lucide-react"

interface Command {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  category: string
}

const COMMANDS: Command[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/", category: "Navigation" },
  { id: "explore", label: "Explore Events", icon: Search, href: "/explore", category: "Navigation" },
  { id: "traces", label: "Search Traces", icon: GitBranch, href: "/traces", category: "Navigation" },
  { id: "errors", label: "View Errors", icon: AlertTriangle, href: "/errors", category: "Navigation" },
  { id: "services", label: "Services", icon: Server, href: "/services", category: "Navigation" },
  { id: "dashboards", label: "Dashboards", icon: LayoutGrid, href: "/dashboards", category: "Navigation" },
  { id: "queries", label: "Saved Queries", icon: ListChecks, href: "/queries", category: "Navigation" },
  { id: "alerts", label: "Alerts", icon: Bell, href: "/alerts", category: "Navigation" },
  { id: "collector", label: "Collector Health", icon: Activity, href: "/collector", category: "System" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings", category: "System" },
]

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFilter("")
      setActiveIndex(0)
    }
  }, [open])

  // Filter commands
  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(filter.toLowerCase())
  )

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0)
  }, [filter])

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current[activeIndex]
    if (el) {
      el.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  const executeCommand = useCallback(
    (cmd: Command) => {
      navigate(cmd.href)
      setOpen(false)
    },
    [navigate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case "Enter":
          e.preventDefault()
          if (filtered[activeIndex]) {
            executeCommand(filtered[activeIndex])
          }
          break
        case "Escape":
          setOpen(false)
          break
      }
    },
    [filtered, activeIndex, executeCommand]
  )

  // Group filtered commands by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-border bg-card p-0 shadow-2xl shadow-black/40 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Menu</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="border-0 bg-transparent pl-2.5 text-sm shadow-none focus-visible:ring-0 h-12"
            autoFocus
          />
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Search className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {filter ? `No commands matching "${filter}"` : "No commands available"}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category} role="group" aria-label={category}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {category}
                </div>
                <ul>
                  {cmds.map((cmd) => {
                    const index = filtered.indexOf(cmd)
                    return (
                      <li key={cmd.id}>
                        <button
                          ref={(el) => { itemRefs.current[index] = el }}
                          role="option"
                          aria-selected={index === activeIndex}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-75",
                            index === activeIndex
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <cmd.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              index === activeIndex ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {index === activeIndex && (
                            <kbd className="hidden h-5 select-none items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                              Enter
                            </kbd>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted/50 px-1 font-mono text-[10px]">
              &uarr;&darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted/50 px-1 font-mono text-[10px]">
              &crarr;
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted/50 px-1 font-mono text-[10px]">
              esc
            </kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
