// @ts-nocheck
"use client";

/**
 * IndexScoreSummary — high-level "here's your score for each index" strip for the
 * top of the DWS Field Employee Experience → Benchmark → Basin Report.
 *
 * Design rules (inherited from the current redesign dashboard — DO NOT reinvent):
 *  - Score color = the shared yellow→white→blue gradient over 60–85
 *    (identical to `makeGradientColor(60, 85)` / `dwsScoreColor` in ee-report-kit.tsx).
 *  - Delta / diff colors = green for up, red for down, from the DWS palette.
 *  - Type = Montserrat (inherited from the app), tabular-friendly weights 700/800.
 *  - Card chrome = 14px radius, 1.5px border, the same soft shadow used elsewhere.
 *
 * Layout: Overall tile is left-justified and ~20% larger; the indexes are
 * justified to the right, so the last index sits on the far edge and the gap
 * between the two groups flexes with the number of indexes.
 *
 * Interaction: every tile is a button. Clicking it expands/contracts its two
 * numbers (delta = change vs prior, diff = vs org) beneath the score; tiles
 * expand independently. A selected/expanded tile takes a border in its OWN
 * darker color (never the nav gold).
 *
 * Prefer wiring `scoreColor` to the report's shared color scale rather than the
 * built-in default, so this strip always matches the tables/charts below it.
 */

import { useState, useMemo } from "react";
// If ee-report-kit.tsx is a sibling, prefer the shared gradient so this strip
// stays in lock-step with the rest of the report:
//   import { makeGradientColor, isLightBand } from "./ee-report-kit";

export interface IndexDatum {
  id: string;
  name: string;
  /** 0–100 index score. */
  score: number;
  /** Change vs the prior campaign. `null` when there is no prior to compare. */
  delta: number | null;
  /** Difference vs the organization / benchmark. */
  diff: number;
}

export interface IndexScoreSummaryProps {
  /** The "Overall" roll-up tile (rendered larger, on the left). */
  overall: IndexDatum;
  /** The indexes, rendered left→right and justified to the right edge. */
  indexes: IndexDatum[];
  /** Maps a score to its fill color. Defaults to the DWS 60–85 gradient. */
  scoreColor?: (value: number) => string;
  /** Tile ids expanded on first render. Defaults to just the Overall tile. */
  defaultExpanded?: string[];
}

/* ---- shared color helpers (mirror ee-report-kit; swap for the real imports) ---- */

// yellow #D7B35A (60) → white (72.5) → blue #3F5F86 (85)
function makeGradientColor(min: number, max: number) {
  const span = max - min || 1;
  return (value: number): string => {
    if (value == null || !Number.isFinite(value)) return "#F1F4F7";
    const t = Math.max(0, Math.min(1, (value - min) / span));
    let r: number, g: number, b: number;
    if (t <= 0.5) {
      const s = t / 0.5;
      r = 215 + (255 - 215) * s; g = 179 + (255 - 179) * s; b = 90 + (255 - 90) * s;
    } else {
      const s = (t - 0.5) / 0.5;
      r = 255 + (63 - 255) * s; g = 255 + (95 - 255) * s; b = 255 + (134 - 255) * s;
    }
    const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  };
}

const dwsScoreColor = makeGradientColor(60, 85);

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function isLight(hex: string): boolean {
  const [r, g, b] = toRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 168;
}
/** A darker version of the tile's own fill — used for the selected border. */
function darken(hex: string, f = 0.64): string {
  const [r, g, b] = toRgb(hex);
  const to = (n: number) => Math.round(n * f).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function textOn(hex: string): string {
  return isLight(hex) ? "#1C252A" : "#FFFFFF";
}
// green up / red down, from the DWS palette (design-tokens.ts green.700 / red.600)
function deltaInk(d: number | null): string {
  if (d == null || Math.abs(d) < 0.05) return "#6E7E96";
  return d > 0 ? "#1C5932" : "#B63A2D";
}
function signed(d: number): string {
  return (d >= 0 ? "+" : "\u2212") + Math.abs(d).toFixed(1);
}
function arrow(d: number): string {
  return d > 0.05 ? "\u25B2" : d < -0.05 ? "\u25BC" : "\u2013";
}

/* --------------------------------- tile --------------------------------- */

function Tile({
  datum,
  isOverall,
  expanded,
  onToggle,
  color,
}: {
  datum: IndexDatum;
  isOverall: boolean;
  expanded: boolean;
  onToggle: () => void;
  color: string;
}) {
  const ink = textOn(color);
  const border = expanded ? darken(color) : "#DDE2DD";
  const width = isOverall ? 152 : 122;

  const Cell = ({
    value,
    valueColor,
    label,
    divider,
  }: {
    value: React.ReactNode;
    valueColor: string;
    label: string;
    divider?: boolean;
  }) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: `${isOverall ? 9 : 7}px 0`,
        borderRight: divider ? "1px solid #EEF1EE" : "none",
      }}
    >
      <div style={{ fontSize: isOverall ? 19 : 16, fontWeight: 800, lineHeight: 1, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AA6B2" }}>
        {label}
      </div>
    </div>
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      style={{
        appearance: "none",
        fontFamily: "inherit",
        padding: 0,
        cursor: "pointer",
        width,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        overflow: "hidden",
        background: color,
        border: `1.5px solid ${border}`,
        boxShadow: expanded
          ? "0 8px 18px rgba(15,23,42,.14)"
          : "0 1px 3px rgba(15,23,42,.08)",
        transition: "border-color .25s, box-shadow .25s",
      }}
    >
      <div
        style={{
          padding: isOverall ? "14px 12px 13px" : "12px 10px 11px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        <div
          style={{
            fontSize: isOverall ? 11 : 10,
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: ink,
            opacity: 0.82,
            minHeight: isOverall ? 24 : 22,
            display: "flex",
            alignItems: "center",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {datum.name}
        </div>
        <div style={{ fontSize: isOverall ? 34 : 28, fontWeight: 800, lineHeight: 1, color: ink }}>
          {datum.score.toFixed(1)}
        </div>
      </div>

      <div
        style={{
          maxHeight: expanded ? (isOverall ? 60 : 52) : 0,
          overflow: "hidden",
          transition: "max-height .34s cubic-bezier(.4,0,.2,1)",
          background: "#fff",
          display: "flex",
          borderTop: expanded ? "1px solid rgba(0,0,0,.06)" : "none",
        }}
      >
        <Cell
          value={datum.delta == null ? "\u2014" : signed(datum.delta)}
          valueColor={deltaInk(datum.delta)}
          label="delta"
          divider
        />
        <Cell
          value={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              {arrow(datum.diff)}
              {Math.abs(datum.diff).toFixed(1)}
            </span>
          }
          valueColor={deltaInk(datum.diff)}
          label="diff"
        />
      </div>
    </button>
  );
}

/* -------------------------------- strip --------------------------------- */

export function IndexScoreSummary({
  overall,
  indexes,
  scoreColor = dwsScoreColor,
  defaultExpanded,
}: IndexScoreSummaryProps) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const seed = defaultExpanded ?? [overall.id];
    return Object.fromEntries(seed.map((id) => [id, true]));
  });
  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const colors = useMemo(() => {
    const map: Record<string, string> = { [overall.id]: scoreColor(overall.score) };
    indexes.forEach((i) => (map[i.id] = scoreColor(i.score)));
    return map;
  }, [overall, indexes, scoreColor]);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <Tile
        datum={overall}
        isOverall
        expanded={!!open[overall.id]}
        onToggle={() => toggle(overall.id)}
        color={colors[overall.id]}
      />
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {indexes.map((idx) => (
          <Tile
            key={idx.id}
            datum={idx}
            isOverall={false}
            expanded={!!open[idx.id]}
            onToggle={() => toggle(idx.id)}
            color={colors[idx.id]}
          />
        ))}
      </div>
    </div>
  );
}

export default IndexScoreSummary;
