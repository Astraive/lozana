import * as React from "react"
import { Check, Copy } from "lucide-react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/cn"

interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  text: string
}

export function CopyButton({ text, className, variant = "ghost", size = "icon", ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const showCopied = React.useCallback(() => {
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current)
    }
    setCopied(true)
    resetTimer.current = setTimeout(() => {
      setCopied(false)
      resetTimer.current = null
    }, 2000)
  }, [])

  React.useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current)
      }
    }
  }, [])

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    showCopied()
  }, [text, showCopied])

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-8 w-8", className)}
      onClick={handleCopy}
      title="Copy to clipboard"
      {...props}
    >
      {copied ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}
