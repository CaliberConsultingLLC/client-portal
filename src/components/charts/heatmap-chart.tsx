"use client";

import { useState, useMemo } from "react";
import {
  scoreScaleColor,
  scoreScaleTextColor,
} from "@/components/collaboration/score-color-scale";

interface HeatmapChartProps {
  /** Row labels (source departments) */
  rows: string[];
  /** Column labels (target departments) */
  columns: string[];
  /** Data matrix: rows[i].scores[column] = value */
  data: { department: string; scores: Record<string, number | null> }[];
  /** Total (average) for each column */
  columnTotals?: Record<string, number>;
  /** Total (average) for each row */
  rowTotals?: Record<string, number>;
  minValue?: number;
  maxValue?: number;
  midpoint?: number;
}

export function HeatmapChart({
  rows,
  columns,
  data,
  columnTotals,
  rowTotals,
  minValue = 5.0,
  maxValue = 9.0,
  midpoint = 7.0,
}: HeatmapChartProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Abbreviate long names for column headers
  const abbreviate = (name: string): string => {
    if (name.length <= 10) return name;
    const words = name.split(/[\s/–-]+/);
    if (words.length >= 2) {
      return words.map((w) => w.substring(0, 4)).join(" ");
    }
    return name.substring(0, 10);
  };

  const sortedData = useMemo(() => {
    return rows.map((dept) => {
      const row = data.find((d) => d.department === dept);
      return row || { department: dept, scores: {} };
    });
  }, [rows, data]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[140px] bg-[#1a1b20] p-2 text-left font-semibold text-slate-300">
              Department
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="min-w-[48px] max-w-[56px] bg-[#1a1b20] p-1 text-center font-medium text-slate-300"
                title={col}
              >
                <div className="mx-auto w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-tight">
                  {abbreviate(col)}
                </div>
              </th>
            ))}
            {rowTotals && (
              <th className="min-w-[52px] bg-black p-2 text-center font-bold text-white">
                Total
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, ri) => (
            <tr key={row.department} className="border-t border-black">
              <td className="sticky left-0 z-10 bg-[#23242a] p-2 font-medium text-slate-100">
                {row.department}
              </td>
              {columns.map((col, ci) => {
                const val = row.scores[col] ?? null;
                const isHovered =
                  hoveredCell?.row === ri || hoveredCell?.col === ci;
                const isSelf = row.department === col;
                return (
                  <td
                    key={col}
                    className="relative p-0.5 text-center"
                    onMouseEnter={() => setHoveredCell({ row: ri, col: ci })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <div
                      className="flex h-7 items-center justify-center rounded-sm text-[11px] font-semibold transition-all"
                      style={{
                        backgroundColor: isSelf
                          ? "#111111"
                          : scoreScaleColor(val, minValue, midpoint, maxValue),
                        color: isSelf
                          ? "#475569"
                          : scoreScaleTextColor(val, midpoint),
                        opacity: isHovered ? 1 : 0.92,
                        transform: isHovered ? "scale(1.08)" : "scale(1)",
                      }}
                      title={`${row.department} → ${col}: ${val?.toFixed(1) ?? "N/A"}`}
                    >
                      {isSelf ? "–" : val ? val.toFixed(1) : ""}
                    </div>
                  </td>
                );
              })}
              {rowTotals && (
                <td className="bg-black p-1 text-center">
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: scoreScaleColor(
                        rowTotals[row.department] ?? null,
                        minValue,
                        midpoint,
                        maxValue
                      ),
                      color: scoreScaleTextColor(
                        rowTotals[row.department] ?? null,
                        midpoint
                      ),
                    }}
                  >
                    {rowTotals[row.department]?.toFixed(1) ?? ""}
                  </span>
                </td>
              )}
            </tr>
          ))}
          {columnTotals && (
            <tr className="border-t-2 border-black">
              <td className="sticky left-0 z-10 bg-black p-2 font-bold text-white">
                Total
              </td>
              {columns.map((col) => (
                <td key={col} className="bg-black p-1 text-center">
                  <span
                    className="inline-block rounded px-1 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: scoreScaleColor(
                        columnTotals[col] ?? null,
                        minValue,
                        midpoint,
                        maxValue
                      ),
                      color: scoreScaleTextColor(columnTotals[col] ?? null, midpoint),
                    }}
                  >
                    {columnTotals[col]?.toFixed(1) ?? ""}
                  </span>
                </td>
              ))}
              {rowTotals && <td className="bg-black" />}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
