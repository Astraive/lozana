import * as React from "react"
import { Select } from "@base-ui/react"
import { cn } from "@/lib/cn"

const SelectRoot = Select.Root
const SelectGroup = Select.Group
const SelectGroupLabel = Select.GroupLabel

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Select.Trigger>
>(({ className, children, ...props }, ref) => (
  <Select.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
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
      className="h-4 w-4 opacity-50"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </Select.Trigger>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof Select.Value>
>(({ className, ...props }, ref) => (
  <Select.Value ref={ref} className={cn("", className)} {...props} />
))
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Select.Popup> & {
    positionerClassName?: string
  }
>(({ className, positionerClassName, children, ...props }, ref) => (
  <Select.Portal>
    <Select.Positioner
      className={cn("z-50", positionerClassName)}
      sideOffset={4}
    >
      <Select.Popup
        ref={ref}
        className={cn(
          "max-h-60 overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md shadow-primary/5 animate-in fade-in-0 zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
      </Select.Popup>
    </Select.Positioner>
  </Select.Portal>
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Select.Item>
>(({ className, children, ...props }, ref) => (
  <Select.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors focus:bg-primary/10 focus:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <Select.ItemText>{children}</Select.ItemText>
    <Select.ItemIndicator className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
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
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </Select.ItemIndicator>
  </Select.Item>
))
SelectItem.displayName = "SelectItem"

const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Select.Label>
>(({ className, ...props }, ref) => (
  <Select.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  SelectRoot as Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
  SelectGroupLabel,
}
