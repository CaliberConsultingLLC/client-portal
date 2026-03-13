"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";

interface GradientBarItem {
  name: string;
  value: number;
}

interface GradientBarChartProps {
  data: GradientBarItem[];
  height?: number;
  average?: number;
  minValue?: number;
  maxValue?: number;
  /** Midpoint where color shifts from gold to green */
  midpoint?: number;
  showAvgLine?: boolean;
  className?: string;
}

export function GradientBarChart({
  data,
  height,
  average,
  minValue = 5.0,
  maxValue = 9.0,
  midpoint = 7.0,
  showAvgLine = true,
  className,
}: GradientBarChartProps) {
  const chartHeight = height || Math.max(400, data.length * 28);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 50, bottom: 5, left: 10 }}
          barCategoryGap="18%"
        >
          <XAxis
            type="number"
            domain={[minValue, maxValue]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            hide
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12, fill: "#cbd5e1", fontWeight: 500 }}
            width={180}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#17181d",
              border: "1px solid #000",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
            formatter={(value) => [Number(value).toFixed(1), "Score"]}
          />
          {showAvgLine && average && (
            <ReferenceLine
              x={average}
              stroke="#475569"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Avg: ${average.toFixed(2)}`,
                position: "bottom",
                fontSize: 11,
                fill: "#94a3b8",
              }}
            />
          )}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={scoreScaleColor(entry.value, minValue, midpoint, maxValue)}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => Number(v).toFixed(1)}
              style={{ fontSize: 12, fontWeight: 600, fill: "#e2e8f0" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
