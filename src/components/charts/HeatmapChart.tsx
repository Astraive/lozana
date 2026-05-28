import * as React from "react"
import { cn } from "@/lib/cn"

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

  const valueRange = React.useMemo(() => {
    const values = data.map((d) => d.value)
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }, [data])

  const dataMap = React.useMemo(() => {
    const map = new Map<string, number>()
    data.forEach((d) => map.set(`${d.x}:${d.y}`, d.value))
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
                const value = dataMap.get(`${x}:${y}`) ?? 0
                return (
                  <div
                    key={`${x}:${y}`}
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
