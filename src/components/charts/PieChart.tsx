import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import { cn } from "@/lib/cn"

interface PieChartDataPoint {
  name: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartDataPoint[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  className?: string
}

const DEFAULT_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "#06b6d4",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#ef4444",
  "#6366f1",
]

export function PieChart({
  data,
  height = 300,
  innerRadius = 0,
  outerRadius,
  className,
}: PieChartProps) {
  const effectiveOuterRadius = outerRadius ?? Math.min(height / 2 - 20, 120)

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={effectiveOuterRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                stroke="var(--background)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(50, 224, 196, 0.05)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                {value}
              </span>
            )}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
