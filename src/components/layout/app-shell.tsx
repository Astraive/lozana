import { useState, useCallback, useEffect, type ReactNode } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { CommandMenu } from "@/components/layout/command-menu"
import { Menu } from "lucide-react"

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Close sidebar on Escape when open (mobile)
  useEffect(() => {
    if (!sidebarOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [sidebarOpen, closeSidebar])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (!sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [sidebarOpen])

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      {/* Skip-to-content for keyboard users */}
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Skip to content
      </a>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar -- fixed on all breakpoints, hidden off-screen on mobile */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile topbar -- only visible below lg to house hamburger */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-12 items-center border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
        <button
          onClick={toggleSidebar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="ml-3 text-sm font-semibold tracking-tight text-foreground">
          Lozana
        </span>
      </header>

      {/* Main content area -- offset by sidebar width on desktop, by mobile topbar height on mobile */}
      <div className="flex h-full flex-col pt-12 lg:ml-56 lg:pt-0">
        {/* Scrollable content area */}
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      <CommandMenu />
    </div>
  )
}
