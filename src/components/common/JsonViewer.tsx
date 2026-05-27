import * as React from "react"
import { cn } from "@/lib/cn"
import { CopyButton } from "@/components/common/CopyButton"

interface JsonViewerProps {
  data: unknown
  expanded?: boolean
  className?: string
}

function SyntaxSpan({ type, children }: { type: "key" | "string" | "number" | "boolean" | "null" | "bracket" | "colon"; children: React.ReactNode }) {
  const className =
    type === "key"
      ? "text-primary"
      : type === "string"
      ? "text-green-400"
      : type === "number"
      ? "text-orange-400"
      : type === "boolean"
      ? "text-purple-400"
      : type === "null"
      ? "text-destructive"
      : type === "bracket"
      ? "text-muted-foreground"
      : "text-muted-foreground"

  return <span className={className}>{children}</span>
}

interface JsonNodeProps {
  keyName?: string
  value: unknown
  depth: number
  defaultExpanded: boolean
}

function JsonNode({ keyName, value, depth, defaultExpanded }: JsonNodeProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  if (value === null) {
    return (
      <div className="pl-4" style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <>
            <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
            <SyntaxSpan type="colon">: </SyntaxSpan>
          </>
        )}
        <SyntaxSpan type="null">null</SyntaxSpan>
      </div>
    )
  }

  if (typeof value === "boolean") {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <>
            <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
            <SyntaxSpan type="colon">: </SyntaxSpan>
          </>
        )}
        <SyntaxSpan type="boolean">{String(value)}</SyntaxSpan>
      </div>
    )
  }

  if (typeof value === "number") {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <>
            <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
            <SyntaxSpan type="colon">: </SyntaxSpan>
          </>
        )}
        <SyntaxSpan type="number">{value}</SyntaxSpan>
      </div>
    )
  }

  if (typeof value === "string") {
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <>
            <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
            <SyntaxSpan type="colon">: </SyntaxSpan>
          </>
        )}
        <SyntaxSpan type="string">"{value}"</SyntaxSpan>
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div style={{ paddingLeft: depth * 16 }}>
          {keyName !== undefined && (
            <>
              <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
              <SyntaxSpan type="colon">: </SyntaxSpan>
            </>
          )}
          <SyntaxSpan type="bracket">[]</SyntaxSpan>
        </div>
      )
    }

    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <span
          className="cursor-pointer hover:bg-primary/10 rounded px-0.5 select-none transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <SyntaxSpan type="bracket">{expanded ? "\u25BC" : "\u25B6"}</SyntaxSpan>
          {keyName !== undefined && (
            <>
              <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
              <SyntaxSpan type="colon">: </SyntaxSpan>
            </>
          )}
          <SyntaxSpan type="bracket">[</SyntaxSpan>
          {!expanded && (
            <span className="text-muted-foreground"> {value.length} items </span>
          )}
          {!expanded && <SyntaxSpan type="bracket">]</SyntaxSpan>}
        </span>
        {expanded && (
          <>
            {value.map((item, i) => (
              <JsonNode
                key={i}
                value={item}
                depth={depth + 1}
                defaultExpanded={defaultExpanded}
              />
            ))}
            <SyntaxSpan type="bracket">]</SyntaxSpan>
          </>
        )}
      </div>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return (
        <div style={{ paddingLeft: depth * 16 }}>
          {keyName !== undefined && (
            <>
              <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
              <SyntaxSpan type="colon">: </SyntaxSpan>
            </>
          )}
          <SyntaxSpan type="bracket">{"{}"}</SyntaxSpan>
        </div>
      )
    }

    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <span
          className="cursor-pointer hover:bg-primary/10 rounded px-0.5 select-none transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <SyntaxSpan type="bracket">{expanded ? "\u25BC" : "\u25B6"}</SyntaxSpan>
          {keyName !== undefined && (
            <>
              <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
              <SyntaxSpan type="colon">: </SyntaxSpan>
            </>
          )}
          <SyntaxSpan type="bracket">{"{"}</SyntaxSpan>
          {!expanded && (
            <span className="text-muted-foreground"> {entries.length} keys </span>
          )}
          {!expanded && <SyntaxSpan type="bracket">{"}"}</SyntaxSpan>}
        </span>
        {expanded && (
          <>
            {entries.map(([k, v]) => (
              <JsonNode
                key={k}
                keyName={k}
                value={v}
                depth={depth + 1}
                defaultExpanded={defaultExpanded}
              />
            ))}
            <SyntaxSpan type="bracket">{"}"}</SyntaxSpan>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      {keyName !== undefined && (
        <>
          <SyntaxSpan type="key">"{keyName}"</SyntaxSpan>
          <SyntaxSpan type="colon">: </SyntaxSpan>
        </>
      )}
      <span>{String(value)}</span>
    </div>
  )
}

export function JsonViewer({ data, expanded = true, className }: JsonViewerProps) {
  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return ""
    }
  }, [data])

  return (
    <div className={cn("relative group", className)}>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={jsonString} />
      </div>
      <div className="rounded-lg border border-border bg-card/50 p-4 overflow-auto font-mono text-sm leading-relaxed">
        <JsonNode value={data} depth={0} defaultExpanded={expanded} />
      </div>
    </div>
  )
}
