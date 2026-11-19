import * as React from "react"
import { cn } from "@/lib/cn"

// A delimiter-free, unambiguous key for an (x, y) cell. Using a plain
// `${x}:${y}` concatenation collides whenever a label contains the delimiter
// (e.g. x="a:b",y="c" and x="a",y="b:c" both produce "a:b:c").
const cellKey = (x: string, y: string) => JSON.stringify([x, y])

interface HeatmapDataPoint {
  x: string
  y: string
  value: number
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[]
  colorScale?: [string, string]
  className?: string
  cellSize?: number
}

/**
 * Compute the value range with an iterative reduction instead of spreading the
 * values into Math.min/Math.max. Spreading passes every element as a function
 * argument and throws RangeError for large datasets. Empty data yields a
 * finite, degenerate range so callers never see Infinity/-Infinity.
 */
export function computeValueRange(data: readonly HeatmapDataPoint[]): { min: number; max: number } {
  if (data.length === 0) return { min: 0, max: 0 }

  let min = data[0].value
  let max = data[0].value
  for (let i = 1; i < data.length; i++) {
    const value = data[i].value
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  return { min, max }
}

function interpolateColor(minColor: string, maxColor: string, ratio: number): string {
  const parseHex = (hex: string) => {
    const h = hex.replace("#", "")
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ]
  }

  const [r1, g1, b1] = parseHex(minColor)
  const [r2, g2, b2] = parseHex(maxColor)
  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)

  return `rgb(${r}, ${g}, ${b})`
}

export function HeatmapChart({
  data,
  colorScale = ["#081417", "#6F00FF"],
  className,
  cellSize = 16,
}: HeatmapChartProps) {
  const xLabels = React.useMemo(() => [...new Set(data.map((d) => d.x))], [data])
  const yLabels = React.useMemo(() => [...new Set(data.map((d) => d.y))], [data])

  const valueRange = React.useMemo(() => computeValueRange(data), [data])

  const dataMap = React.useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((d) => map.set(cellKey(d.x, d.y), d.value))
    return map
  }, [data])

  const getColor = (value: number) => {
    if (valueRange.max === valueRange.min) return colorScale[0]
    const ratio = (value - valueRange.min) / (valueRange.max - valueRange.min)
    return interpolateColor(colorScale[0], colorScale[1], ratio)
  }

  return (
    <div className={cn("inline-block", className)}>
      <div className="flex">
        <div className="flex flex-col justify-end pr-2">
          {yLabels.map((label) => (
            <div
              key={label}
              className="flex items-center justify-end text-xs text-muted-foreground font-mono"
              style={{ height: cellSize + 2, marginRight: 4 }}
            >
              {label}
            </div>
          ))}
        </div>
        <div>
          <div className="flex mb-1">
            {xLabels.map((label) => (
              <div
                key={label}
                className="text-xs text-muted-foreground text-center font-mono"
                style={{ width: cellSize + 2 }}
              >
                {label}
              </div>
            ))}
          </div>
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${xLabels.length}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${yLabels.length}, ${cellSize}px)`,
            }}
          >
            {yLabels.map((y) =>
              xLabels.map((x) => {
                const value = dataMap.get(cellKey(x, y)) ?? 0
                return (
                  <div
                    key={cellKey(x, y)}
                    className="rounded-sm cursor-default transition-all duration-150 hover:ring-1 hover:ring-primary hover:ring-offset-1 hover:ring-offset-background"
                    style={{
                      backgroundColor: getColor(value),
                      width: cellSize,
                      height: cellSize,
                    }}
                    title={`${x}, ${y}: ${value}`}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
