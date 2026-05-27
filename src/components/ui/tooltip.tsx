import * as React from "react"
import { Tooltip } from "@base-ui/react"
import { cn } from "@/lib/cn"

const TooltipProvider = Tooltip.Provider

const TooltipRoot = Tooltip.Root

const TooltipTrigger = Tooltip.Trigger

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Tooltip.Popup>
>(({ className, ...props }, ref) => (
  <Tooltip.Portal>
    <Tooltip.Positioner sideOffset={4}>
      <Tooltip.Popup
        ref={ref}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-popover border border-border px-3 py-1.5 text-xs text-popover-foreground shadow-md shadow-primary/5 animate-in fade-in-0 zoom-in-95 font-mono",
          className
        )}
        {...props}
      />
    </Tooltip.Positioner>
  </Tooltip.Portal>
))
TooltipContent.displayName = "TooltipContent"

export { TooltipRoot, TooltipProvider, TooltipTrigger, TooltipContent }
