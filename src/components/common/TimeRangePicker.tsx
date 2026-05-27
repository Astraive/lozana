import * as React from "react"
import { Clock, ChevronDown } from "lucide-react"
import { cn } from "@/lib/cn"

const TIME_RANGES = [
  { label: "Last 5m", value: "5m" },
  { label: "Last 15m", value: "15m" },
  { label: "Last 1h", value: "1h" },
  { label: "Last 6h", value: "6h" },
  { label: "Last 24h", value: "24h" },
  { label: "Last 7d", value: "7d" },
  { label: "Last 30d", value: "30d" },
] as const

interface TimeRangePickerProps {
  value: string
  onChange: (range: string) => void
  className?: string
}

export function TimeRangePicker({ value, onChange, className }: TimeRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const selectedLabel =
    TIME_RANGES.find((r) => r.value === value)?.label ?? value

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-200 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        onClick={() => setOpen(!open)}
      >
        <Clock className="h-3.5 w-3.5" />
        {selectedLabel}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md shadow-primary/5 animate-in fade-in-0 zoom-in-95">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              role="option"
              aria-selected={value === range.value}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset font-mono",
                value === range.value && "bg-primary/10 text-primary font-medium"
              )}
              onClick={() => {
                onChange(range.value)
                setOpen(false)
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
