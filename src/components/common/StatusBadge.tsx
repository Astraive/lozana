import { cn } from "@/lib/cn"

const statusConfig: Record<string, { label: string; className: string; dotClassName: string }> = {
  healthy: {
    label: "Healthy",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
    dotClassName: "bg-green-400 shadow-green-400/50 shadow-sm",
  },
  ok: {
    label: "OK",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
    dotClassName: "bg-green-400 shadow-green-400/50 shadow-sm",
  },
  warning: {
    label: "Warning",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dotClassName: "bg-yellow-400 shadow-yellow-400/50 shadow-sm",
  },
  degraded: {
    label: "Degraded",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dotClassName: "bg-yellow-400 shadow-yellow-400/50 shadow-sm",
  },
  error: {
    label: "Error",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClassName: "bg-red-400 shadow-red-400/50 shadow-sm",
  },
  critical: {
    label: "Critical",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClassName: "bg-red-400 shadow-red-400/50 shadow-sm",
  },
  unknown: {
    label: "Unknown",
    className: "bg-muted text-muted-foreground border-border",
    dotClassName: "bg-muted-foreground",
  },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase()
  const config = statusConfig[normalized] ?? statusConfig.unknown

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold font-mono uppercase tracking-wider",
        config.className,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.dotClassName
        )}
      />
      {config.label}
    </span>
  )
}
