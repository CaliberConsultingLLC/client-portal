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
  /** Midpoint where color shifts from red to teal */
  midpoint?: number;
  showAvgLine?: boolean;
  className?: string;
}

/** Interpolate between red/pink and teal based on score */
function scoreColor(value: number, min: number, mid: number, max: number): string {
  if (value <= min) return "#e8a0a0"; // pink-red
  if (value >= max) return "#2d8f8f"; // deep teal
  if (value < mid) {
    // Interpolate red -> light pink
    const t = (value - min) / (mid - min);
    const r = Math.round(232 - t * 40);
    const g = Math.round(160 + t * 50);
    const b = Math.round(160 + t * 50);
    return `rgb(${r},${g},${b})`;
  }
  // Interpolate light teal -> deep teal
  const t = (value - mid) / (max - mid);
  const r = Math.round(170 - t * 125);
  const g = Math.round(210 - t * 67);
  const b = Math.round(210 - t * 67);
  return `rgb(${r},${g},${b})`;
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
            tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }}
            width={180}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(value) => [Number(value).toFixed(1), "Score"]}
          />
          {showAvgLine && average && (
            <ReferenceLine
              x={average}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Avg: ${average.toFixed(2)}`,
                position: "bottom",
                fontSize: 11,
                fill: "#64748b",
              }}
            />
          )}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={scoreColor(entry.value, minValue, midpoint, maxValue)}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => Number(v).toFixed(1)}
              style={{ fontSize: 12, fontWeight: 600, fill: "#334155" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
