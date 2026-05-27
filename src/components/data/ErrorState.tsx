import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

interface ErrorStateProps {
  error: Error
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-destructive/10 border border-destructive/20 mb-5">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Something went wrong</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed font-mono">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
