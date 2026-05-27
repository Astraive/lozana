import { Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"

interface LoadingStateProps {
  text?: string
  className?: string
}

export function LoadingState({ text, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4",
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && (
        <p className="mt-4 text-sm text-muted-foreground font-mono">{text}</p>
      )}
    </div>
  )
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  )
}

export { Skeleton }
