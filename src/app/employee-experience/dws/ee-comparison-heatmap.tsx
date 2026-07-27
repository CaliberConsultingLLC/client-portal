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
  getColumnAverage,
  getRowAverage,
  grandAverage: grandAverageProp,
  scoreColor,
  columnHeader = "Statement",
  splitColumnNames = false,
  verticalHeaders,
}: {
  statements: { id: string; text: string }[];
  columns: { id: string; name: string }[];
  getValue: (statementId: string, columnId: string) => number | null;
  /**
   * Person average for a whole column (that group across every statement in
   * scope). Averages are supplied by the caller from precomputed person scores —
   * the heatmap must never average its own cells to produce a total.
   */
  getColumnAverage: (columnId: string) => number | null;
  /** Person average for a statement row across everyone in scope. */
  getRowAverage: (statementId: string) => number | null;
  /** Person average for the whole scope (the bottom-right total). */
  grandAverage: number | null;
  scoreColor: (value: number) => string;
  columnHeader?: string;
  splitColumnNames?: boolean;
  /** Force vertical column headers. Defaults to on when there are many columns. */
  verticalHeaders?: boolean;
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
  // of the bar chart, which wants to fill available width. With many columns
  // (e.g. every supervisor), headers rotate vertical so columns stay narrow
  // and the table fits without a huge horizontal scroll.
  const longestLabel = columns.reduce((max, column) => Math.max(max, column.name.length), 3);
  const manyColumns = verticalHeaders ?? columns.length > 6;
  const dataColPx = manyColumns
    ? 48
    : Math.min(92, Math.max(64, longestLabel * 6.5 + 20));
  const statementColPx = manyColumns ? 220 : undefined;
  const verticalHeaderHeight = Math.min(150, Math.max(88, Math.ceil(longestLabel / 2) * 6.2 + 34));
  const cellPad = manyColumns ? "6px 4px" : "8px 6px";
  const valueFontSize = manyColumns ? 12 : 12.5;
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

  const VerticalLabel = ({ text, ink = "#3B4B63" }: { text: string; ink?: string }) => (
    <div style={{ height: verticalHeaderHeight - 20, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <span
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          whiteSpace: "normal",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          height: "100%",
          maxWidth: dataColPx - 6,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.01em",
          color: ink,
          lineHeight: 1.12,
          textTransform: "none",
        }}
      >
        {text}
      </span>
    </div>
  );

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
            padding: manyColumns ? "6px 0" : "7px 0",
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
    const value = getColumnAverage(column.id);
    return typeof value === "number" ? round1(value) : 0;
  });
  const grandAverage = typeof grandAverageProp === "number" ? round1(grandAverageProp) : 0;

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: valueFontSize, tableLayout: "fixed" }}>
        <colgroup>
          <col style={statementColPx ? { width: statementColPx } : undefined} />
          {columns.map((column) => (
            <col key={`col-${column.id}`} style={{ width: dataColPx }} />
          ))}
          <col style={{ width: dataColPx }} />
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                ...headBand,
                textAlign: "left",
                padding: "11px 12px",
                verticalAlign: manyColumns ? "bottom" : "middle",
              }}
            >
              {columnHeader}
            </th>
            {columns.map((column) =>
              manyColumns ? (
                <th
                  key={column.id}
                  style={{
                    ...headBand,
                    height: verticalHeaderHeight,
                    padding: "10px 0 12px",
                    verticalAlign: "bottom",
                    textTransform: "none",
                    letterSpacing: "normal",
                  }}
                >
                  <VerticalLabel
                    text={
                      splitColumnNames
                        ? (() => {
                            const parts = splitName(column.name);
                            return [parts.top, parts.bottom].filter(Boolean).join(" ");
                          })()
                        : column.name
                    }
                  />
                </th>
              ) : (
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
              )
            )}
            {/* Darker, non-muted text on the summary column — same accent the
                Segment Breakdown heatmap gives its "Overall" column header to
                set the roll-up apart from the individual entity columns. */}
            {manyColumns ? (
              <th
                style={{
                  ...headBand,
                  borderLeft: DIVIDER,
                  height: verticalHeaderHeight,
                  padding: "10px 0 12px",
                  verticalAlign: "bottom",
                  textTransform: "none",
                  letterSpacing: "normal",
                  color: "#152238",
                }}
              >
                <VerticalLabel text="Avg" ink="#152238" />
              </th>
            ) : (
              <th style={{ ...headBand, borderLeft: DIVIDER, whiteSpace: "nowrap", color: "#152238" }}>Avg</th>
            )}
          </tr>
        </thead>
        <tbody>
          {statements.map((statement) => {
            const rowAverageValue = getRowAverage(statement.id);
            const rowAverage = typeof rowAverageValue === "number" ? round1(rowAverageValue) : 0;
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
