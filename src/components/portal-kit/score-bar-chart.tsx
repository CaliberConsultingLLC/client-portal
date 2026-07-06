"use client";

// ─── ScoreBarChart ────────────────────────────────────────────────────────────
// Horizontal score bars with: a colored bar (score gradient), an inset value
// chip, a benchmark/org marker line, and an optional delta pill in a fixed right
// column. Rows use uniform height + even vertical gaps so the delta pills line up
// on a steady rhythm regardless of label length (labels clamp to 2 lines).

const f1 = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1);

export interface ScoreBarRow {
  id: string;
  name: string;
  value: number;
  /** Benchmark / org marker position (same scale as value). Optional. */
  org?: number;
  /** Delta vs benchmark; when provided, renders the right-side pill. */
  delta?: number | null;
}

export function ScoreBarChart({
  rows,
  axis,
  scoreColor,
  showDelta = true,
  rowHeight = 44,
  rowGap = 14,
  barThickness = 32,
}: {
  rows: ScoreBarRow[];
  axis: { min: number; max: number; ticks: number[] };
  scoreColor: (value: number) => string;
  showDelta?: boolean;
  rowHeight?: number;
  rowGap?: number;
  barThickness?: number;
}) {
  const pct = (value: number) =>
    ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;
  const gapCol = showDelta ? "140px" : "0px";
  return (
    <div className="pk-chart" style={{ ["--pk-label-col" as string]: "280px", ["--pk-gap-col" as string]: gapCol }}>
      <style>{`
        .pk-chart{position:relative}
        .pk-plot{display:flex;flex-direction:column;gap:${rowGap}px}
        .pk-row{display:grid;grid-template-columns:minmax(0,min(var(--pk-label-col),50%)) minmax(0,1fr) var(--pk-gap-col);align-items:center;column-gap:16px;height:${rowHeight}px}
        .pk-label{font-size:12.5px;line-height:1.15;font-weight:500;color:#152238;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .pk-track{height:${barThickness}px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .pk-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0}
        .pk-chip{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .pk-org{position:absolute;top:2px;bottom:2px;width:0;border-left:2.5px solid rgba(21,34,56,.55);z-index:5}
        .pk-org-dot{position:absolute;top:50%;width:16px;height:16px;border-radius:999px;background:#152238;border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.32);z-index:6}
        .pk-gap-col{display:flex;align-items:center;justify-content:center;padding-left:10px}
        .pk-gap-pill{min-width:96px;padding:4px 10px;border-radius:999px;text-align:center;font-size:13px;font-weight:900;border:1px solid}
        .pk-grid{position:absolute;top:0;bottom:22px;left:0;right:var(--pk-gap-col);pointer-events:none}
        .pk-gridline{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed #E2E8EF}
        .pk-axis{display:grid;grid-template-columns:minmax(0,min(var(--pk-label-col),50%)) minmax(0,1fr) var(--pk-gap-col);column-gap:16px;margin-top:6px}
        .pk-axis-track{position:relative;height:16px}
        .pk-tick{position:absolute;transform:translateX(-50%);font-size:11px;color:#152238}
      `}</style>
      <div className="pk-plot" style={{ position: "relative" }}>
        <div className="pk-grid">
          {axis.ticks.map((tick) => (
            <div key={tick} className="pk-gridline" style={{ left: `calc((100% ) * ${pct(tick) / 100})` }} />
          ))}
        </div>
        {rows.map((row) => {
          const color = scoreColor(row.value);
          const delta = row.delta ?? 0;
          const gapTone =
            delta >= 0
              ? { bg: "#DCEFE2", fg: "#2F6A45", border: "#9BC6A9" }
              : { bg: "#F4DEDD", fg: "#8A3D3A", border: "#D5A3A0" };
          return (
            <div className="pk-row" key={row.id}>
              <div className="pk-label" title={row.name}>{row.name}</div>
              <div className="pk-track">
                <div className="pk-bar" style={{ width: `${pct(row.value)}%`, background: color, outline: "1px solid rgba(0,0,0,0.18)" }}>
                  <div className="pk-chip">{row.value.toFixed(1)}</div>
                </div>
                {row.org != null ? (
                  <>
                    <div className="pk-org" style={{ left: `${pct(row.org)}%` }} />
                    <div className="pk-org-dot" style={{ left: `${pct(row.org)}%` }} />
                  </>
                ) : null}
              </div>
              {showDelta ? (
                <div className="pk-gap-col">
                  <div className="pk-gap-pill" style={{ background: gapTone.bg, color: gapTone.fg, borderColor: gapTone.border }}>
                    {f1(delta)}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="pk-axis">
        <div />
        <div className="pk-axis-track">
          {axis.ticks.map((tick) => (
            <div key={tick} className="pk-tick" style={{ left: `${pct(tick)}%` }}>{tick}</div>
          ))}
        </div>
        <div />
      </div>
    </div>
  );
}
