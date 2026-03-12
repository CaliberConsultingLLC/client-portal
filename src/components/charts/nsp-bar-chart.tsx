"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { chartTheme } from "@/styles/chart-theme";

interface BarChartDataItem {
  name: string;
  value: number;
  color?: string;
}

interface NspBarChartProps {
  data: BarChartDataItem[];
  height?: number;
  showGrid?: boolean;
  horizontal?: boolean;
  colorByIndex?: boolean;
}

export function NspBarChart({
  data,
  height = 300,
  showGrid = true,
  horizontal = false,
  colorByIndex = true,
}: NspBarChartProps) {
  const colors = chartTheme.colors.primary;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 5, right: 20, bottom: 5, left: horizontal ? 80 : 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray={chartTheme.defaults.gridStrokeDasharray}
            stroke={chartTheme.defaults.gridStroke}
            vertical={!horizontal}
            horizontal={horizontal || true}
          />
        )}
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12, fill: chartTheme.defaults.axisPrimary }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: chartTheme.defaults.axisPrimary }}
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: chartTheme.defaults.axisPrimary }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: chartTheme.defaults.axisPrimary }}
              axisLine={false}
              tickLine={false}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.defaults.tooltipBg,
            border: `1px solid ${chartTheme.defaults.tooltipBorder}`,
            borderRadius: "8px",
            fontSize: "13px",
            boxShadow: chartTheme.defaults.tooltipShadow,
          }}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={
                entry.color ||
                (colorByIndex
                  ? colors[index % colors.length]
                  : colors[0])
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
