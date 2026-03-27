"use client";

import { useState, useMemo } from "react";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";

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
  rowLabelHeader?: string;
  abbreviateHeaders?: boolean;
  columnMinWidthClassName?: string;
  columnWidthClassName?: string;
}

export function HeatmapChart({
  rows,
  columns,
  data,
  columnTotals,
  rowTotals,
  minValue = 3.0,
  maxValue = 9.0,
  midpoint = 6.0,
  rowLabelHeader = "Department",
  abbreviateHeaders = false,
  columnMinWidthClassName = "min-w-[112px]",
  columnWidthClassName = "w-[112px]",
}: HeatmapChartProps) {
  const gridLineColor = "#7F91A8";
  const strongGridLineColor = "#5E7898";
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
      <table
        className="w-full border-collapse text-xs"
        style={{ border: `1px solid ${gridLineColor}` }}
      >
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 min-w-[140px] bg-white p-2 text-left font-semibold text-text-secondary"
              style={{
                borderRight: `1px solid ${gridLineColor}`,
                borderBottom: `1px solid ${strongGridLineColor}`,
              }}
            >
              {rowLabelHeader}
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className={`${columnMinWidthClassName} ${columnWidthClassName} bg-white p-1 text-center font-bold text-text-primary`}
                title={col}
                style={{
                  borderRight: `1px solid ${gridLineColor}`,
                  borderBottom: `1px solid ${strongGridLineColor}`,
                }}
              >
                <div
                  className={`mx-auto text-[10px] leading-tight ${
                    abbreviateHeaders
                      ? "w-[52px] overflow-hidden text-ellipsis whitespace-nowrap"
                      : "w-full whitespace-normal break-words"
                  }`}
                >
                  {abbreviateHeaders ? abbreviate(col) : col}
                </div>
              </th>
            ))}
            {rowTotals && (
              <th
                className="min-w-[52px] bg-surface-3 p-2 text-center font-bold text-text-primary"
                style={{ borderBottom: `1px solid ${strongGridLineColor}` }}
              >
                Total
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, ri) => (
            <tr key={row.department}>
              <td
                className="sticky left-0 z-10 bg-white p-2 font-medium text-text-primary"
                style={{
                  borderRight: `1px solid ${gridLineColor}`,
                  borderTop: `1px solid ${gridLineColor}`,
                }}
              >
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
                    className="p-2 text-center text-[11px] font-semibold transition-all"
                    onMouseEnter={() => setHoveredCell({ row: ri, col: ci })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${row.department} → ${col}: ${val ? formatScoreForDisplay(val) : "N/A"}`}
                    style={{
                      backgroundColor: isSelf
                        ? "#EFE9DB"
                        : scoreScaleColor(val, minValue, midpoint, maxValue),
                      color: "#1C252A",
                      opacity: isHovered ? 1 : 0.94,
                      borderRight: `1px solid ${gridLineColor}`,
                      borderTop: `1px solid ${gridLineColor}`,
                    }}
                  >
                    {isSelf ? "–" : val ? formatScoreForDisplay(val) : ""}
                  </td>
                );
              })}
              {rowTotals && (
                <td
                  className="p-2 text-center text-[11px] font-bold"
                  style={{
                    backgroundColor: scoreScaleColor(
                      rowTotals[row.department] ?? null,
                      minValue,
                      midpoint,
                      maxValue
                    ),
                    color: "#1C252A",
                    borderTop: `1px solid ${gridLineColor}`,
                  }}
                >
                  {formatScoreForDisplay(rowTotals[row.department] ?? null)}
                </td>
              )}
            </tr>
          ))}
          {columnTotals && (
            <tr>
              <td
                className="sticky left-0 z-10 bg-surface-3 p-2 font-bold text-text-primary"
                style={{
                  borderTop: `2px solid ${strongGridLineColor}`,
                  borderRight: `1px solid ${gridLineColor}`,
                }}
              >
                Total
              </td>
              {columns.map((col) => (
                <td
                  key={col}
                  className="p-2 text-center text-[11px] font-bold"
                  style={{
                    backgroundColor: scoreScaleColor(
                      columnTotals[col] ?? null,
                      minValue,
                      midpoint,
                      maxValue
                    ),
                    color: "#1C252A",
                    borderTop: `2px solid ${strongGridLineColor}`,
                    borderRight: `1px solid ${gridLineColor}`,
                  }}
                >
                  {formatScoreForDisplay(columnTotals[col] ?? null)}
                </td>
              ))}
              {rowTotals && (
                <td
                  className="bg-surface-3"
                  style={{ borderTop: `2px solid ${strongGridLineColor}` }}
                />
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
