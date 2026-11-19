import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";

interface LozaLineChartProps {
  data: Record<string, unknown>[];
  xField: string;
  yField: string;
  height?: number;
  color?: string;
  className?: string;
}

/**
 * Backwards-compatible name for the shared Recharts line-chart wrapper.
 *
 * Rendering now lives in a single place (TimeSeriesChart). The only behavioral
 * differences between the two former copies were the grid and tooltip cursor
 * styling, which are expressed here through the shared component's optional
 * props. The public props of this component are unchanged.
 */
export function LozaLineChart({
  data,
  xField,
  yField,
  height,
  color,
  className,
}: LozaLineChartProps) {
  return (
    <TimeSeriesChart
      data={data}
      xField={xField}
      yField={yField}
      height={height}
      color={color}
      className={className}
      gridVertical={false}
      tooltipCursor={{ stroke: "var(--border)" }}
    />
  );
}
