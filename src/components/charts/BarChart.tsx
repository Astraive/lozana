import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { cn } from "@/lib/cn"

interface BarChartProps {
  data: Record<string, unknown>[]
  xField: string
  yField: string
  height?: number
  color?: string
  className?: string
}

export function BarChart({
  data,
  xField,
  yField,
  height = 300,
  color = "var(--primary)",
  className,
}: BarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey={xField}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              boxShadow: "0 4px 12px rgba(50, 224, 196, 0.05)",
            }}
            labelStyle={{ color: "var(--foreground)", marginBottom: 4 }}
            itemStyle={{ color: "var(--muted-foreground)" }}
            cursor={{ fill: "var(--muted)", opacity: 0.15 }}
          />
          <Bar dataKey={yField} fill={color} radius={[3, 3, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
