import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/cn";

interface LozaLineChartProps {
  data: Record<string, unknown>[];
  xField: string;
  yField: string;
  height?: number;
  color?: string;
  className?: string;
}

export function LozaLineChart({
  data,
  xField,
  yField,
  height = 300,
  color = "var(--primary)",
  className,
}: LozaLineChartProps) {
  return (
    <div className={cn("w-full", className)}>
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
          cursor={{ stroke: "var(--border)" }}
        />
        <Line
          type="monotone"
          dataKey={yField}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "var(--background)", strokeWidth: 2 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
    </div>
  );
}
