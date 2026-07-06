// @ts-nocheck
"use client";

/**
 * SegmentComparison — a replicable "compare a segment breakdown" block for the
 * new **Segment Breakdown** perspective of the DWS Field Employee Experience
 * dashboard.
 *
 * One instance = one segment dimension (e.g. Job Category). A report can stack
 * several of these down the page (Job Category, then Tenure, then Role…), each
 * independently filtered. This first deliverable ships ONE instance: Job Category.
 *
 * Anatomy (top-to-bottom, all one connected section):
 *   1. Section label  — "{segmentLabel} Comparison"  (uses the portal `.slabel`)
 *   2. Index rail + funnel — the rail is the EXACT attached tab strip from the
 *      Basin Report (`ee-department-report.tsx`, field layout). Selecting an
 *      index re-scores the funnel AND the heatmap below. The funnel replaces the
 *      horizontal bar chart: a centered, ranked cascade of the segment values.
 *   3. Statement heatmap — one row per statement in the selected index, one
 *      column per segment value, plus an "Overall" column pinned to the far
 *      right behind a thick divider.
 *   4. A hard rule closes the section so the next instance stacks cleanly.
 *
 * DESIGN-SYSTEM PARITY (do this when wiring into the app):
 *   - Colors come from the shared score scale. Replace the local `dwsScoreColor`
 *     below with the real `scoreColor` / `makeGradientColor` + `isLightBand`
 *     from `ee-report-kit.tsx` so cells match the rest of the report.
 *   - Prefer the portal CSS classes over the inline values here: `.card`,
 *     `.card-body`, `.slabel`. The inline numbers below mirror those classes
 *     (`.slabel` = 11px/700/.2em uppercase var(--text-muted); `.card` =
 *     1px var(--border-strong) / 1rem radius / the standard card shadow) — they
 *     are only inlined so this file renders standalone.
 *   - Type is inherited Montserrat; weights 700/800, sizes as noted.
 */

import { useState, useMemo } from "react";

export interface SegmentValue {
  key: string;
  label: string;
  n: number;
}
export interface IndexRef {
  id: string;
  name: string;
  score: number;
}
export interface StatementRow {
  text: string;
  /** score per segment key, plus `overall`. */
  scores: Record<string, number>;
  overall: number;
}
export interface SegmentComparisonProps {
  /** Name of the dimension being compared, e.g. "Job Category". */
  segmentLabel: string;
  /** Unit in view, e.g. "East Texas". */
  unitLabel: string;
  /** Total respondents for the unit (shown once, top-right). */
  respondents: number;
  /** The rail options (indexes). */
  indexes: IndexRef[];
  /** The segment values → funnel bars + heatmap columns (must be in parity). */
  segments: SegmentValue[];
  /** Funnel score for each segment key, per index id. */
  funnelByIndex: Record<string, Record<string, number>>;
  /** Statement rows per index id (heatmap body). */
  statementsByIndex: Record<string, StatementRow[]>;
  /** Score → fill color. Swap for the report's shared scale. */
  scoreColor?: (v: number) => string;
  /** Index selected initially (defaults to the first). */
  defaultIndexId?: string;
  /** Render the closing hard rule (set false for the last section). Default true. */
  trailingRule?: boolean;
}

/* ---------- shared color helpers — replace with ee-report-kit's ---------- */
function makeGradientColor(min: number, max: number) {
  const span = max - min || 1;
  return (v: number): string => {
    const t = Math.max(0, Math.min(1, (v - min) / span));
    let r: number, g: number, b: number;
    if (t <= 0.5) { const s = t / 0.5; r = 215 + 40 * s; g = 179 + 76 * s; b = 90 + 165 * s; }
    else { const s = (t - 0.5) / 0.5; r = 255 - 192 * s; g = 255 - 160 * s; b = 255 - 121 * s; }
    const hx = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${hx(r)}${hx(g)}${hx(b)}`;
  };
}
const dwsScoreColor = makeGradientColor(48, 66); // segment-range scale; swap for shared
function toRgb(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function textOn(hex: string) { const [r, g, b] = toRgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b > 172 ? "#1C252A" : "#fff"; }

/* -------------------------------- rail ---------------------------------- */
function IndexRail({ indexes, activeId, onSelect }: { indexes: IndexRef[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, width: 156, flexShrink: 0, paddingTop: 14, paddingBottom: 14 }}>
      {indexes.map((idx, i) => {
        const active = idx.id === activeId;
        return (
          <button
            key={idx.id}
            type="button"
            onClick={() => onSelect(idx.id)}
            style={{
              flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center",
              textAlign: "center", padding: "0 12px",
              borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderTopRightRadius: 0, borderBottomRightRadius: 0,
              cursor: "pointer", fontSize: 12, lineHeight: 1.15, transition: "all .16s", position: "relative",
              marginBottom: i === indexes.length - 1 ? 0 : -1,
              fontFamily: "inherit", appearance: "none",
              ...(active
                ? { background: "#fff", color: "#1E2329", fontWeight: 800, border: "1px solid #8798AA", borderRight: "none", marginRight: -1, zIndex: 2, boxShadow: "-1px 0 3px rgba(15,23,42,.05)" }
                : { background: "#EEF2F6", color: "#5A6B82", fontWeight: 600, border: "1px solid #D4DAD6", zIndex: 1 }),
            }}
          >
            {idx.name}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- funnel --------------------------------- */
function Funnel({ segments, scoreByKey, scoreColor }: { segments: SegmentValue[]; scoreByKey: Record<string, number>; scoreColor: (v: number) => string }) {
  const ranked = [...segments].map((s) => ({ ...s, score: scoreByKey[s.key] })).sort((a, b) => b.score - a.score);
  const min = Math.min(...ranked.map((r) => r.score));
  const max = Math.max(...ranked.map((r) => r.score));
  return (
    <div style={{ flex: 1, minWidth: 0, border: "1px solid #8798AA", background: "#fff", borderRadius: 16, boxShadow: "7px 9px 20px rgba(15,23,42,.09),2px 3px 6px rgba(15,23,42,.05)", overflow: "hidden" }}>
      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 6 }}>
        {ranked.map((r) => {
          const t = max === min ? 1 : (r.score - min) / (max - min);
          const w = 46 + t * 52;
          const bg = scoreColor(r.score);
          const ink = textOn(bg);
          return (
            <div key={r.key} style={{ width: `${w}%`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 15px", borderRadius: 9, background: bg, color: ink, minHeight: 32, boxShadow: "0 1px 3px rgba(15,23,42,.10)" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".01em", whiteSpace: "nowrap" }}>{r.label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.6 }}>n={r.n}</span>
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 800, flexShrink: 0 }}>{r.score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ heatmap --------------------------------- */
function StatementHeatmap({ indexName, segments, rows, scoreColor, accent }: { indexName: string; segments: SegmentValue[]; rows: StatementRow[]; scoreColor: (v: number) => string; accent: string }) {
  const thBase: React.CSSProperties = { padding: "8px 10px", background: "#E2E8EF", borderBottom: "1px solid #8798AA", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#59675C", textAlign: "center", whiteSpace: "nowrap" };
  return (
    <div style={{ marginTop: 14, border: "1px solid #8798AA", borderTop: `3px solid ${accent}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,.06)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: "left", width: 340 }}>{indexName} statements</th>
            {segments.map((s) => (<th key={s.key} style={thBase}>{s.label}</th>))}
            <th style={{ ...thBase, borderLeft: "2.5px solid #8798AA", color: "#152238" }}>Overall</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const cell = (v: number, ovr = false) => {
              const bg = scoreColor(v);
              return (
                <td key={ovr ? "ovr" : Math.random()} style={{ padding: "5px 6px", borderTop: ri === 0 ? "none" : "1px solid #EEF1EE", textAlign: "center", borderLeft: ovr ? "2.5px solid #8798AA" : "1px solid #F3F5F3" }}>
                  <div style={{ minWidth: 46, margin: "0 auto", padding: "7px 0", borderRadius: 8, background: bg, color: textOn(bg), fontSize: 13, fontWeight: 800 }}>{v.toFixed(1)}</div>
                </td>
              );
            };
            return (
              <tr key={ri}>
                <td style={{ padding: "9px 12px", borderTop: ri === 0 ? "none" : "1px solid #EEF1EE", fontSize: 12.5, color: "#20303F", lineHeight: 1.3 }}>{row.text}</td>
                {segments.map((s) => (
                  <td key={s.key} style={{ padding: "5px 6px", borderTop: ri === 0 ? "none" : "1px solid #EEF1EE", textAlign: "center", borderLeft: "1px solid #F3F5F3" }}>
                    <div style={{ minWidth: 46, margin: "0 auto", padding: "7px 0", borderRadius: 8, background: scoreColor(row.scores[s.key]), color: textOn(scoreColor(row.scores[s.key])), fontSize: 13, fontWeight: 800 }}>{row.scores[s.key].toFixed(1)}</div>
                  </td>
                ))}
                {cell(row.overall, true)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ section --------------------------------- */
export function SegmentComparison({
  segmentLabel, unitLabel, respondents, indexes, segments,
  funnelByIndex, statementsByIndex, scoreColor = dwsScoreColor,
  defaultIndexId, trailingRule = true,
}: SegmentComparisonProps) {
  const [activeId, setActiveId] = useState<string>(defaultIndexId ?? indexes[0]?.id);
  const active = useMemo(() => indexes.find((i) => i.id === activeId) ?? indexes[0], [indexes, activeId]);
  const accent = scoreColor(active.score);

  return (
    <div>
      {/* section label — mirrors .slabel */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 8px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#6E7E96", margin: 0 }}>{segmentLabel} Comparison</p>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", color: "#9AA6B2" }}>{unitLabel} · n = {respondents}</span>
      </div>

      {/* rail + funnel */}
      <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
        <IndexRail indexes={indexes} activeId={activeId} onSelect={setActiveId} />
        <Funnel segments={segments} scoreByKey={funnelByIndex[activeId]} scoreColor={scoreColor} />
      </div>

      {/* statement heatmap */}
      <StatementHeatmap indexName={active.name} segments={segments} rows={statementsByIndex[activeId] ?? []} scoreColor={scoreColor} accent={accent} />

      {trailingRule ? <div style={{ borderTop: "2px solid #152238", marginTop: 24 }} /> : null}
    </div>
  );
}

export default SegmentComparison;
