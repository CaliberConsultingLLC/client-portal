"use client";

import { useState, useMemo } from "react";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";

/** Dark or light chip text depending on the chip background luminance. */
function readableText(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#1C252A";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C252A" : "#fff";
}

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
  scoreColorResolver?: (value: number | null) => string;
  /**
   * Cell paint style. "fill" (default) paints the whole cell with the score
   * color — used by the EE Heat Maps page and Integration Effectiveness.
   * "chip" keeps the cell white and paints only a rounded inner chip (~86% of
   * the column), matching the EE comparison-heatmap treatment.
   */
  variant?: "fill" | "chip";
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
  scoreColorResolver,
  variant = "fill",
}: HeatmapChartProps) {
  const isChip = variant === "chip";
  const gridLineColor = "#D3DDE7";
  const strongGridLineColor = "#8798AA";
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

  const resolveScoreColor = (value: number | null) =>
    scoreColorResolver ? scoreColorResolver(value) : scoreScaleColor(value, minValue, midpoint, maxValue);

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
                className="min-w-[52px] bg-[#E2E8EF] p-[11px_8px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]"
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
                className="sticky left-0 z-10 bg-white p-[9px_14px] text-[12.5px] font-medium text-[#152238]"
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
                // Chip variant (EE comparison-heatmap treatment): the cell stays
                // white and only a rounded inner chip (~86% of the column) carries
                // the score color, instead of filling the cell edge-to-edge. Empty
                // (rule-of-two suppressed) cells render as a plain white square.
                const chipColor = isSelf
                  ? "#EFE9DB"
                  : val !== null
                    ? resolveScoreColor(val)
                    : null;
                if (isChip) {
                  return (
                    <td
                      key={col}
                      className="p-[6px_8px] text-center align-middle transition-all"
                      onMouseEnter={() => setHoveredCell({ row: ri, col: ci })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${row.department} → ${col}: ${val ? formatScoreForDisplay(val) : "N/A"}`}
                      style={{
                        backgroundColor: "#fff",
                        borderRight: `1px solid ${gridLineColor}`,
                        borderTop: `1px solid ${gridLineColor}`,
                      }}
                    >
                      {chipColor ? (
                        <div
                          className="mx-auto text-[12.5px] font-bold"
                          style={{
                            width: "86%",
                            padding: "7px 0",
                            borderRadius: 9,
                            background: chipColor,
                            color: readableText(chipColor),
                            opacity: isHovered ? 1 : 0.94,
                          }}
                        >
                          {isSelf ? "–" : formatScoreForDisplay(val)}
                        </div>
                      ) : null}
                    </td>
                  );
                }
                return (
                  <td
                    key={col}
                    className="p-[6px_8px] text-center text-[12.5px] font-bold transition-all"
                    onMouseEnter={() => setHoveredCell({ row: ri, col: ci })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${row.department} → ${col}: ${val ? formatScoreForDisplay(val) : "N/A"}`}
                    style={{
                      backgroundColor: isSelf
                        ? "#EFE9DB"
                        : resolveScoreColor(val),
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
              {rowTotals &&
                (isChip ? (
                  <td
                    className="p-[6px_8px] text-center align-middle"
                    style={{
                      backgroundColor: "#fff",
                      borderTop: `1px solid ${gridLineColor}`,
                    }}
                  >
                    {(() => {
                      const totalVal = rowTotals[row.department] ?? null;
                      if (totalVal === null) return null;
                      const totalColor = resolveScoreColor(totalVal);
                      return (
                        <div
                          className="mx-auto text-[12.5px] font-bold"
                          style={{
                            width: "86%",
                            padding: "7px 0",
                            borderRadius: 9,
                            background: totalColor,
                            color: readableText(totalColor),
                          }}
                        >
                          {formatScoreForDisplay(totalVal)}
                        </div>
                      );
                    })()}
                  </td>
                ) : (
                  <td
                    className="p-[6px_8px] text-center text-[12.5px] font-bold"
                    style={{
                      backgroundColor: resolveScoreColor(rowTotals[row.department] ?? null),
                      color: "#1C252A",
                      borderTop: `1px solid ${gridLineColor}`,
                    }}
                  >
                    {formatScoreForDisplay(rowTotals[row.department] ?? null)}
                  </td>
                ))}
            </tr>
          ))}
          {columnTotals && (
            <tr>
              <td
                className="sticky left-0 z-10 bg-[#E2E8EF] p-[9px_14px] text-[12.5px] font-bold text-[#152238]"
                style={{
                  borderTop: `2px solid ${strongGridLineColor}`,
                  borderRight: `1px solid ${gridLineColor}`,
                }}
              >
                Total
              </td>
              {columns.map((col) => {
                const totalVal = columnTotals[col] ?? null;
                if (isChip) {
                  const totalColor =
                    totalVal !== null ? resolveScoreColor(totalVal) : null;
                  return (
                    <td
                      key={col}
                      className="p-[6px_8px] text-center align-middle"
                      style={{
                        backgroundColor: "#fff",
                        borderTop: `2px solid ${strongGridLineColor}`,
                        borderRight: `1px solid ${gridLineColor}`,
                      }}
                    >
                      {totalColor ? (
                        <div
                          className="mx-auto text-[12.5px] font-bold"
                          style={{
                            width: "86%",
                            padding: "7px 0",
                            borderRadius: 9,
                            background: totalColor,
                            color: readableText(totalColor),
                          }}
                        >
                          {formatScoreForDisplay(totalVal)}
                        </div>
                      ) : null}
                    </td>
                  );
                }
                return (
                  <td
                    key={col}
                    className="p-[6px_8px] text-center text-[12.5px] font-bold"
                    style={{
                      backgroundColor: resolveScoreColor(totalVal),
                      color: "#1C252A",
                      borderTop: `2px solid ${strongGridLineColor}`,
                      borderRight: `1px solid ${gridLineColor}`,
                    }}
                  >
                    {formatScoreForDisplay(totalVal)}
                  </td>
                );
              })}
              {rowTotals && (
                <td
                  className="bg-[#E2E8EF]"
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
