import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/cn"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
})

interface DropdownMenuProps {
  children: React.ReactNode
}

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, asChild, ...props }, ref) => {
    const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext)
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      },
      [ref, triggerRef]
    )

    if (asChild && React.isValidElement(children)) {
      const childProps: Record<string, unknown> = {
        ref: mergedRef,
        onClick: (e: React.MouseEvent) => {
          setOpen(!open)
          ;(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e)
        },
      }
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, childProps)
    }

    return (
      <button
        ref={mergedRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
}

function DropdownMenuContent({ className, align = "center", children, ...props }: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      let left = rect.left
      if (align === "center") left = rect.left + rect.width / 2
      else if (align === "end") left = rect.right

      setPosition({
        top: rect.bottom + 4,
        left,
      })
    }
  }, [open, align, triggerRef])

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        if (!contentRef.current) return
        const items = Array.from(contentRef.current.querySelectorAll('[role="menuitem"]')) as HTMLElement[]
        if (items.length === 0) return
        const currentIndex = items.indexOf(document.activeElement as HTMLElement)
        let nextIndex: number
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
        }
        items[nextIndex]?.focus()
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
      // Focus first menu item when opened
      requestAnimationFrame(() => {
        const firstItem = contentRef.current?.querySelector('[role="menuitem"]') as HTMLElement | null
        firstItem?.focus()
      })
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [open, setOpen, triggerRef])

  if (!open) return null

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md shadow-primary/5 animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: align === "center" ? "translateX(-50%)" : align === "end" ? "translateX(-100%)" : undefined,
      }}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

function DropdownMenuItem({ className, inset, children, ...props }: DropdownMenuItemProps) {
  const { setOpen } = React.useContext(DropdownMenuContext)

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&>svg]:size-4 [&>svg]:shrink-0",
        inset && "pl-8",
        className
      )}
      role="menuitem"
      tabIndex={0}
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setOpen(false)
        }
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}

function DropdownMenuLabel({ className, inset, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return <div className={cn("px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", inset && "pl-8", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
