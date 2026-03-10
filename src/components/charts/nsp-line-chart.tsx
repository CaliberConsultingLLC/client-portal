"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { chartTheme } from "@/styles/chart-theme";

interface LineChartSeries {
  dataKey: string;
  name: string;
  color?: string;
}

interface NspLineChartProps {
  data: Record<string, unknown>[];
  series: LineChartSeries[];
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
}

export function NspLineChart({
  data,
  series,
  xAxisKey = "name",
  height = 300,
  showGrid = true,
  showLegend = true,
  showDots = true,
}: NspLineChartProps) {
  const colors = chartTheme.colors.primary;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray={chartTheme.defaults.gridStrokeDasharray}
            stroke={chartTheme.defaults.gridStroke}
          />
        )}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.defaults.tooltipBg,
            border: `1px solid ${chartTheme.defaults.tooltipBorder}`,
            borderRadius: "8px",
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{
              fontSize: "12px",
              paddingTop: "8px",
            }}
          />
        )}
        {series.map((s, i) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={s.color || colors[i % colors.length]}
            strokeWidth={2}
            dot={showDots ? { r: 3, strokeWidth: 2 } : false}
            activeDot={{ r: 5, strokeWidth: 2 }}
            animationDuration={chartTheme.defaults.animationDuration}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
