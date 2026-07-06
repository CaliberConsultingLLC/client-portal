"use client";

// Shared field-layout helpers for the EE comparison perspectives:
//  - IndexToggleColumn: a vertical, single-select index switcher placed to the
//    left of the comparison bar chart (matches the report index toggle).
//  - ComparisonHeatmap: statement (row) × entity (column) heat map with a right
//    "Avg" column and a bottom subtotal row, matching the Heat Maps page style.

function readableText(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#1C252A";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C252A" : "#fff";
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function splitName(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return { top: "", bottom: "" };
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return { top: last, bottom: first || "" };
  }
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { top: parts[0], bottom: "" };
  return { top: parts.at(-1) ?? raw, bottom: parts.slice(0, -1).join(" ") };
}

export function IndexToggleColumn({
  indexes,
  activeId,
  onSelect,
}: {
  indexes: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 172, flexShrink: 0 }}>
      {indexes.map((index) => {
        const active = activeId === index.id;
        return (
          <button
            key={index.id}
            type="button"
            onClick={() => onSelect(index.id)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "11px 12px",
              borderRadius: 11,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.25,
              transition: "all .16s",
              ...(active
                ? { background: "#2B2B2B", color: "#fff", border: "1px solid #2B2B2B", boxShadow: "0 1px 3px rgba(15,23,42,.08)" }
                : { background: "#fff", color: "#3B4B63", border: "1px solid #D4DAD6" }),
            }}
          >
            {index.name}
          </button>
        );
      })}
    </div>
  );
}

export function ComparisonHeatmap({
  statements,
  columns,
  getValue,
  scoreColor,
  columnHeader = "Statement",
  splitColumnNames = false,
}: {
  statements: { id: string; text: string }[];
  columns: { id: string; name: string }[];
  getValue: (statementId: string, columnId: string) => number | null;
  scoreColor: (value: number) => string;
  columnHeader?: string;
  splitColumnNames?: boolean;
}) {
  if (statements.length === 0 || columns.length === 0) {
    return <p style={{ fontSize: 12, color: "#6E7E96", margin: 0 }}>No statement data is available for this selection.</p>;
  }

  // Every grid line uses the same light, uniform color; the Avg row/column
  // gets a slightly thicker divider (same treatment as the app-wide
  // col-group-start/end dividers) instead of a different border color, so
  // the heatmap reads as one consistent grid with a single sectioning line.
  const GRID = "1px solid #D3DDE7";
  const DIVIDER = "3px solid #8798AA";

  // Heatmaps read best as small, uniform, Excel-style cells — the opposite
  // of the bar chart, which wants to fill available width. Entity columns
  // (basins, departments, etc.) — and the Avg column, sized the same way —
  // get one consistent, capped width sized to fit their header text
  // (wrapping up to ~2 lines), never stretched to fill leftover space. The
  // statement column takes whatever room is left and is never squeezed for
  // their sake. This is a plain px number (not a CSS calc()/min() string) on
  // purpose: <col> elements don't reliably honor calc()/min() expressions
  // across browsers, which is exactly why these were stretching wide instead
  // of staying capped — same fixed-width approach as the Segment Breakdown
  // heatmap's column sizing.
  const longestLabel = columns.reduce((max, column) => Math.max(max, column.name.length), 3);
  const dataColPx = Math.min(92, Math.max(64, longestLabel * 6.5 + 20));
  const cellPad = "8px 6px";
  const valueFontSize = 12.5;
  const headerHeight = 44;

  const headBand: React.CSSProperties = {
    background: "#E2E8EF",
    textAlign: "center",
    padding: "8px 6px",
    border: GRID,
    color: "#6E7E96",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    lineHeight: 1.15,
    wordBreak: "break-word",
    overflowWrap: "break-word",
    hyphens: "auto",
    WebkitHyphens: "auto",
  };

  // Same "rounded chip on a white cell" treatment as the Segment Breakdown
  // heatmap: the cell itself stays a plain white grid square, and only a
  // chip sized to a share of the column width carries the score color —
  // instead of filling the whole cell edge-to-edge.
  const chip = (value: number, keySuffix: string, extraTdStyle?: React.CSSProperties) => {
    const color = scoreColor(value);
    return (
      <td key={keySuffix} style={{ border: GRID, background: "#fff", padding: cellPad, textAlign: "center", ...extraTdStyle }}>
        <div
          style={{
            width: "86%",
            margin: "0 auto",
            padding: "7px 0",
            borderRadius: 9,
            background: color,
            color: readableText(color),
            fontSize: valueFontSize,
            fontWeight: 800,
          }}
        >
          {value.toFixed(1)}
        </div>
      </td>
    );
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
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: valueFontSize, tableLayout: "fixed" }}>
        <colgroup>
          <col />
          {columns.map((column) => (
            <col key={`col-${column.id}`} style={{ width: dataColPx }} />
          ))}
          <col style={{ width: dataColPx }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...headBand, textAlign: "left", padding: "11px 12px" }}>{columnHeader}</th>
            {columns.map((column) => (
              <th
                key={column.id}
                style={{
                  ...headBand,
                  height: headerHeight,
                  verticalAlign: "middle",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  lineHeight: 1.15,
                }}
              >
                {splitColumnNames ? (
                  (() => {
                    const parts = splitName(column.name);
                    return (
                      <span className="block">
                        <span className="block">{parts.top}</span>
                        <span className="block">{parts.bottom}</span>
                      </span>
                    );
                  })()
                ) : (
                  column.name
                )}
              </th>
            ))}
            {/* Darker, non-muted text on the summary column — same accent the
                Segment Breakdown heatmap gives its "Overall" column header to
                set the roll-up apart from the individual entity columns. */}
            <th style={{ ...headBand, borderLeft: DIVIDER, whiteSpace: "nowrap", color: "#152238" }}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((statement) => {
            const rowValues = columns
              .map((column) => getValue(statement.id, column.id))
              .filter((value): value is number => typeof value === "number" && value > 0);
            const rowAverage = rowValues.length > 0 ? round1(rowValues.reduce((sum, value) => sum + value, 0) / rowValues.length) : 0;
            return (
              <tr key={statement.id}>
                <td style={{ border: GRID, padding: "9px 12px", color: "#152238", lineHeight: 1.2, fontWeight: 500, textAlign: "center" }}>
                  {statement.text}
                </td>
                {columns.map((column) =>
                  chip(getValue(statement.id, column.id) ?? 0, `${statement.id}-${column.id}`)
                )}
                {chip(rowAverage, `${statement.id}-avg`, { borderLeft: DIVIDER })}
              </tr>
            );
          })}
          <tr>
            <td style={{ ...headBand, textAlign: "left", padding: "10px 12px", borderTop: DIVIDER, color: "#152238" }}>Avg</td>
            {columns.map((column, columnIndex) =>
              chip(columnAverages[columnIndex], `avg-${column.id}`, { borderTop: DIVIDER })
            )}
            {chip(grandAverage, "grand-avg", { borderTop: DIVIDER, borderLeft: DIVIDER })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
