import { useEffect, useCallback } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/cn"
import { APP_VERSION } from "@/lib/version"
import { useCollectorHealth } from "@/lib/hooks"
import {
  LayoutDashboard,
  Search,
  GitBranch,
  AlertTriangle,
  Server,
  LayoutGrid,
  ListChecks,
  Bell,
  Activity,
  Settings,
  X,
  Command,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/traces", label: "Traces", icon: GitBranch },
  { href: "/errors", label: "Errors", icon: AlertTriangle },
  { href: "/services", label: "Services", icon: Server },
  { href: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { href: "/queries", label: "Queries", icon: ListChecks },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/collector", label: "Collector", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const health = useCollectorHealth()
  const isOnline = health.isSuccess && health.data?.status === "ok"

  // Close sidebar on Escape (mobile)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Depth gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Logo area */}
      <div className="relative flex h-12 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <span className="text-base font-bold tracking-tight text-sidebar-foreground">
          Lozana
        </span>
        <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
          v{APP_VERSION}
        </span>
        {/* Close button -- mobile only */}
        <button
          onClick={onClose}
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Navigation -- scrollable if items overflow */}
      <nav className="flex-1 overflow-y-auto px-2 py-2" role="navigation" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {/* Active left accent bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-150",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom status area */}
      <div className="relative shrink-0 border-t border-sidebar-border px-4 py-3">
        {/* Cmd+K hint */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
          }}
          className="mb-2 flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Command className="h-3 w-3" />
          <span>Press</span>
          <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
          <span>to search</span>
        </button>
        {/* System status */}
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            {isOnline && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            )}
            <span className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              isOnline ? "bg-primary" : health.isLoading ? "bg-yellow-500" : "bg-destructive"
            )} />
          </span>
          <span>{isOnline ? "System Online" : health.isLoading ? "Connecting..." : "System Offline"}</span>
        </div>
      </div>
    </aside>
  )
}
