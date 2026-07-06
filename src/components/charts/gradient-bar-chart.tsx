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
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";

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
  /** Midpoint where color shifts from low to high color */
  midpoint?: number;
  showAvgLine?: boolean;
  className?: string;
  categoryAxisWidth?: number;
}

export function GradientBarChart({
  data,
  height,
  average,
  minValue = 3.0,
  maxValue = 9.0,
  midpoint = 6.0,
  showAvgLine = true,
  className,
  categoryAxisWidth = 180,
}: GradientBarChartProps) {
  const chartHeight = height || Math.max(400, data.length * 32);

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
            tick={{ fontSize: 11, fill: "#334155", fontWeight: 500 }}
            width={categoryAxisWidth}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "12px",
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(value) => [formatScoreForDisplay(Number(value)), "Score"]}
          />
          {showAvgLine && average && (
            <ReferenceLine
              x={average}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Avg: ${formatScoreForDisplay(average)}`,
                position: "bottom",
                fontSize: 11,
                fill: "#64748b",
              }}
            />
          )}
          <Bar dataKey="value" radius={[0, 12, 12, 0]} maxBarSize={24}>
            {data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={scoreScaleColor(entry.value, minValue, midpoint, maxValue)}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => formatScoreForDisplay(Number(v))}
              style={{ fontSize: 12, fontWeight: 600, fill: "#334155" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
