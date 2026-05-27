import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/cn"

interface SheetContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  setOpen: () => {},
})

interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [controlledOpen, onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

function SheetTrigger({ children, asChild, ...props }: SheetTriggerProps) {
  const { setOpen } = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: (e: React.MouseEvent) => {
        setOpen(true)
        ;(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e)
      },
    })
  }

  return (
    <button type="button" aria-haspopup="dialog" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  )
}

type SheetSide = "top" | "bottom" | "left" | "right"

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide
}

const sideStyles: Record<SheetSide, string> = {
  top: "inset-x-0 top-0 border-b animate-in slide-in-from-top",
  bottom: "inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom",
  left: "inset-y-0 left-0 h-full w-3/4 border-r animate-in slide-in-from-left sm:max-w-sm",
  right: "inset-y-0 right-0 h-full w-3/4 border-l animate-in slide-in-from-right sm:max-w-sm",
}

function SheetContent({ className, side = "right", children, ...props }: SheetContentProps) {
  const { open, setOpen } = React.useContext(SheetContext)

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
      return () => {
        document.removeEventListener("keydown", handleKeyDown)
        document.body.style.overflow = ""
      }
    }
  }, [open, setOpen])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed gap-4 border-border bg-card p-6 shadow-lg shadow-primary/5 transition ease-in-out",
          sideStyles[side],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          onClick={() => setOpen(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold leading-none text-foreground uppercase tracking-wider", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
}

function SheetClose({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(SheetContext)
  return (
    <button type="button" className={className} onClick={() => setOpen(false)} {...props}>
      {children}
    </button>
  )
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose }
