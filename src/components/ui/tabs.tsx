import * as React from "react"

import { cn } from "@/lib/cn"
import { chainEventHandlers, getArrowKeyIndex } from "@/lib/ui-utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
  baseId: string
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
  baseId: "tabs",
})

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const baseId = React.useId()
  const value =
    controlledValue !== undefined ? controlledValue : internalValue

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [controlledValue, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange, baseId }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted/50 p-1 text-muted-foreground border border-border/50",
        className
      )}
      role="tablist"
      {...props}
    />
  )
}

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ className, value, onClick, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } =
    React.useContext(TabsContext)
  const isActive = selectedValue === value

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event)
    onValueChange(value)
function TabsTrigger({ className, value, onKeyDown, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange, baseId } =
    React.useContext(TabsContext)
  const isActive = selectedValue === value

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return
    e.preventDefault()
    const tabs = Array.from(
      e.currentTarget
        .closest('[role="tablist"]')
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    )
    const currentIndex = tabs.indexOf(e.currentTarget)
    const next = tabs[getArrowKeyIndex(e.key, currentIndex, tabs.length)]
    next?.focus()
    next?.click()
  }

  return (
    <button
      {...props}
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={isActive ? `${baseId}-panel-${value}` : undefined}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        isActive && "bg-background text-primary shadow-sm shadow-primary/10 border border-primary/20",
        !isActive && "hover:text-foreground hover:bg-muted/80",
        className
      )}
      onClick={handleClick}
      onClick={() => onValueChange(value)}
      onKeyDown={chainEventHandlers(onKeyDown, handleKeyDown)}
      {...props}
    />
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  const { value: selectedValue, baseId } = React.useContext(TabsContext)
  if (selectedValue !== value) return null

  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
