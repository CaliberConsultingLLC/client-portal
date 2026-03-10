"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { chartTheme } from "@/styles/chart-theme";

interface RadarDataItem {
  dimension: string;
  value: number;
  benchmark?: number;
  fullMark?: number;
}

interface NspRadarChartProps {
  data: RadarDataItem[];
  height?: number;
  showBenchmark?: boolean;
  maxValue?: number;
}

export function NspRadarChart({
  data,
  height = 350,
  showBenchmark = false,
  maxValue = 5,
}: NspRadarChartProps) {
  const colors = chartTheme.colors.primary;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke={chartTheme.defaults.gridStroke} />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <PolarRadiusAxis
          domain={[0, maxValue]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
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
        <Radar
          name="Score"
          dataKey="value"
          stroke={colors[0]}
          fill={colors[0]}
          fillOpacity={0.2}
          strokeWidth={2}
          animationDuration={chartTheme.defaults.animationDuration}
        />
        {showBenchmark && (
          <Radar
            name="Benchmark"
            dataKey="benchmark"
            stroke={colors[2]}
            fill={colors[2]}
            fillOpacity={0.08}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
