import { BarChart, type BarChartProps } from "@/components/charts/BarChart";

export type LozaBarChartProps = Omit<BarChartProps, "radius">;

export function LozaBarChart(props: LozaBarChartProps) {
  return <BarChart {...props} radius={[4, 4, 0, 0]} />;
}
