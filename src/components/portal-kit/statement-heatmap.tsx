"use client";

// ─── StatementHeatmap ─────────────────────────────────────────────────────────
// Statement (row) × entity (column) heat map with a right "Avg" column and a
// bottom subtotal row. Uses the shared score gradient for cells and the standard
// Caliber table frame (#8798AA outer border, #E2E8EF header band, #D3DDE7 grid,
// uppercase muted column labels, bold centered score cells).

import { readableText } from "./colors";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export interface HeatmapStatement {
  id: string;
  text: string;
}
export interface HeatmapColumn {
  id: string;
  name: string;
}

export function StatementHeatmap({
  statements,
  columns,
  getValue,
  scoreColor,
  columnHeader = "Statement",
}: {
  statements: HeatmapStatement[];
  columns: HeatmapColumn[];
  getValue: (statementId: string, columnId: string) => number | null;
  scoreColor: (value: number) => string;
  columnHeader?: string;
}) {
  if (statements.length === 0 || columns.length === 0) {
    return <p style={{ fontSize: 12, color: "#6E7E96", margin: 0 }}>No statement data is available for this selection.</p>;
  }

  const headBand: React.CSSProperties = {
    background: "#E2E8EF",
    textAlign: "center",
    padding: "11px 8px",
    border: "1px solid #D3DDE7",
    color: "#6E7E96",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    lineHeight: 1.1,
  };

  const columnAverages = columns.map((column) => {
    const values = statements
      .map((statement) => getValue(statement.id, column.id))
      .filter((value): value is number => typeof value === "number" && value > 0);
    return values.length > 0 ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  });
  const grandValues = columnAverages.filter((value) => value > 0);
  const grandAverage = grandValues.length > 0 ? round1(grandValues.reduce((sum, value) => sum + value, 0) / grandValues.length) : 0;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 12.5, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 420 }} />
          {columns.map((column) => (
            <col key={`col-${column.id}`} style={{ width: 92 }} />
          ))}
          <col style={{ width: 78 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...headBand, textAlign: "left", padding: "11px 12px" }}>{columnHeader}</th>
            {columns.map((column) => (
              <th key={column.id} style={{ ...headBand, height: 52 }}>{column.name}</th>
            ))}
            <th style={{ ...headBand, border: "1px solid #8798AA", whiteSpace: "nowrap" }}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((statement) => {
            const rowValues = columns
              .map((column) => getValue(statement.id, column.id))
              .filter((value): value is number => typeof value === "number" && value > 0);
            const rowAverage = rowValues.length > 0 ? round1(rowValues.reduce((sum, value) => sum + value, 0) / rowValues.length) : 0;
            const rowAverageColor = scoreColor(rowAverage);
            return (
              <tr key={statement.id}>
                <td style={{ border: "1px solid #D3DDE7", padding: "9px 12px", color: "#152238", lineHeight: 1.2, fontWeight: 500 }}>
                  {statement.text}
                </td>
                {columns.map((column) => {
                  const value = getValue(statement.id, column.id) ?? 0;
                  const color = scoreColor(value);
                  return (
                    <td
                      key={`${statement.id}-${column.id}`}
                      style={{ border: "1px solid #D3DDE7", textAlign: "center", padding: "8px", background: color, color: readableText(color), fontWeight: 800 }}
                    >
                      {value.toFixed(1)}
                    </td>
                  );
                })}
                <td style={{ border: "1px solid #8798AA", textAlign: "center", padding: "8px", background: rowAverageColor, color: readableText(rowAverageColor), fontWeight: 900 }}>
                  {rowAverage.toFixed(1)}
                </td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...headBand, textAlign: "left", padding: "10px 12px", border: "1px solid #8798AA" }}>Avg</td>
            {columns.map((column, columnIndex) => {
              const value = columnAverages[columnIndex];
              const color = scoreColor(value);
              return (
                <td
                  key={`avg-${column.id}`}
                  style={{ border: "1px solid #8798AA", textAlign: "center", padding: "8px", background: color, color: readableText(color), fontWeight: 900 }}
                >
                  {value.toFixed(1)}
                </td>
              );
            })}
            <td style={{ border: "1px solid #8798AA", textAlign: "center", padding: "8px", background: scoreColor(grandAverage), color: readableText(scoreColor(grandAverage)), fontWeight: 900 }}>
              {grandAverage.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
