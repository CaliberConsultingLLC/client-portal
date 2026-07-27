"use client";

/**
 * IndexScoreSummary — high-level "here's your score for each index" strip for
 * the top of the DWS Field Employee Experience → Benchmark → Basin Report.
 *
 * Design reference: design_handoff_index_summary/IndexScoreSummary.tsx
 * (prototype 7a). Recreated here against the app's real design system —
 * shared score gradient, shared palette tokens — instead of the prototype's
 * bundled color helpers.
 *
 * One deliberate change from the handoff: tiles are no longer filled edge to
 * edge with the score color. Only a small rounded chip behind the score
 * number carries the color; the tile itself stays a neutral card so the
 * strip reads calmer next to the tables/charts below it.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { colors } from "@/styles/design-tokens";
import { dwsScoreColor, isLightBand } from "./ee-report-kit";

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
  /** Maps a score to its fill color. Defaults to the shared DWS 60–85 gradient. */
  scoreColor?: (value: number) => string;
  /** Tile ids expanded on first render. Defaults to just the Overall tile. */
  defaultExpanded?: string[];
  /**
   * Basin Report ONLY (surface/elevation treatment "1b"): renders tiles with
   * a soft border + elevation shadow instead of the hard `#8798AA` border.
   * Every other consumer of this component leaves this unset and keeps the
   * current look.
   */
  surfaceTreatment?: "1b";
  /**
   * Compact mode: thinner tiles, smaller type, tighter gaps, and no wrapping —
   * so a 6-index set (7 tiles incl. Overall) fits on a single row on the DWS
   * office dashboard instead of spilling to a second line.
   */
  compact?: boolean;
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function textOn(hex: string): string {
  return isLightBand(hex) ? "#1C252A" : "#FFFFFF";
}
// green up / red down, from the shared DWS palette (design-tokens.ts green.700 / red.600)
function deltaInk(d: number | null): string {
  if (d == null || Math.abs(d) < 0.05) return "#6E7E96";
  return d > 0 ? colors.green[700] : colors.red[600];
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
  surfaceTreatment,
  compact = false,
}: {
  datum: IndexDatum;
  isOverall: boolean;
  expanded: boolean;
  onToggle: () => void;
  color: string;
  surfaceTreatment?: "1b";
  compact?: boolean;
}) {
  // Same slight-blue #8798AA border family as every other card on the page
  // and the active Index Rail tab — no color change on expand/collapse, so
  // Overall and the indexes read as one consistent set. Basin Report surface
  // treatment "1b" dials the same blue down to 70% opacity (30% more
  // transparent) so it reads a touch quieter than the rest of the portal,
  // and doubles the resting shadow to compensate for sitting on the tinted
  // canvas instead of plain white.
  const border = surfaceTreatment === "1b" ? "rgba(135,152,170,0.7)" : "#8798AA";
  const restingShadow =
    surfaceTreatment === "1b"
      ? "0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20)"
      : "0 1px 3px rgba(15,23,42,.08)";
  // White instead of the gray-blue KPI tile fill — these tiles sit against
  // the shell's framing gradient wash (or, on Basin Report, the tinted
  // `#F4F4EF` canvas), so they need to read as bright, clean cards floating
  // on top of it rather than blending into it. Surface treatment "1b" only
  // softens the border/shadow — the fill stays white either way so the data
  // pops against the tinted page background around it.
  const TILE_BG = "#fff";
  const width = isOverall ? (compact ? 166 : 182) : (compact ? 126 : 146);

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
        padding: `${isOverall ? 10 : 8}px 0`,
        borderRight: divider ? "1px solid #EEF1EE" : "none",
      }}
    >
      {/* Matches the delta/vs-org number treatment used in the tables and bar
          charts below (12.5–13px, weight 800) instead of a bespoke larger size. */}
      <div style={{ fontSize: isOverall ? 14 : 13, fontWeight: 800, lineHeight: 1, color: valueColor }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AA6B2" }}>
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
        background: TILE_BG,
        border: `${surfaceTreatment === "1b" ? "1px" : "1.5px"} solid ${border}`,
        boxShadow: expanded && surfaceTreatment !== "1b" ? "0 8px 18px rgba(15,23,42,.14)" : restingShadow,
        transition: "border-color .25s, box-shadow .25s",
      }}
    >
      <div
        style={{
          padding: isOverall
            ? compact
              ? "15px 12px 14px"
              : "17px 14px 16px"
            : compact
              ? "13px 10px 12px"
              : "14px 12px 13px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isOverall ? (compact ? 9 : 10) : compact ? 7 : 8,
        }}
      >
        {/* Unbolded, same muted ink as the rail's inactive tab text — keeps card
            titles cohesive with the rest of the chrome instead of a bespoke style. */}
        <div
          style={{
            fontSize: isOverall ? (compact ? 12 : 13) : compact ? 11 : 12,
            fontWeight: 700,
            letterSpacing: compact ? "0.04em" : "0.05em",
            textTransform: "uppercase",
            color: "#6E7E96",
            minHeight: isOverall ? (compact ? 28 : 29) : compact ? 25 : 26,
            display: "flex",
            alignItems: "center",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {datum.name}
        </div>
        <div
          style={{
            background: color,
            color: textOn(color),
            borderRadius: 10,
            padding: isOverall
              ? compact
                ? "6px 17px"
                : "6px 19px"
              : compact
                ? "5px 14px"
                : "5px 16px",
            // Same bold weight as the Overall tile — the "unbolded" experiment
            // read as a different, thinner typeface at this size, so bold
            // stays the fixed rule for every score number. Sized down instead
            // (21 vs Overall's 31) so the smaller tiles carry visual weight
            // through hierarchy (size), not through being lighter.
            fontSize: isOverall ? (compact ? 28 : 31) : compact ? 19 : 21,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {datum.score.toFixed(1)}
        </div>
      </div>

      <div
        style={{
          maxHeight: expanded ? (isOverall ? 56 : 50) : 0,
          overflow: "hidden",
          transition: "max-height .34s cubic-bezier(.4,0,.2,1)",
          background: TILE_BG,
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
  surfaceTreatment,
  compact = false,
}: IndexScoreSummaryProps) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const seed = defaultExpanded ?? [overall.id];
    return Object.fromEntries(seed.map((id) => [id, true]));
  });
  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  // Single expand/collapse-all toggle. It doesn't track individual tile
  // state — it just flips its own up/down affordance each click and forces
  // every tile to match, then you can fan back out individually from there.
  const [allOpen, setAllOpen] = useState(false);
  const allIds = useMemo(() => [overall.id, ...indexes.map((i) => i.id)], [overall, indexes]);
  const toggleAll = () => {
    const next = !allOpen;
    setAllOpen(next);
    setOpen(Object.fromEntries(allIds.map((id) => [id, next])));
  };

  const tileColors = useMemo(() => {
    const map: Record<string, string> = { [overall.id]: scoreColor(overall.score) };
    indexes.forEach((i) => (map[i.id] = scoreColor(i.score)));
    return map;
  }, [overall, indexes, scoreColor]);

  // "Index cards" pattern, meant to be reused with any index count: the
  // Overall tile anchors the left edge, and everything to its right is free
  // space that the index group centers itself within — rather than pinning
  // to the far edge — so it reads intentional whether there are 3 indexes or
  // 7, and reflows (via wrap) instead of overflowing on narrower dashboards.
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 16 }}>
      <Tile
        datum={overall}
        isOverall
        expanded={!!open[overall.id]}
        onToggle={() => toggle(overall.id)}
        color={tileColors[overall.id]}
        surfaceTreatment={surfaceTreatment}
        compact={compact}
      />
      <button
        type="button"
        onClick={toggleAll}
        title={allOpen ? "Collapse all" : "Expand all"}
        aria-label={allOpen ? "Collapse all" : "Expand all"}
        style={{
          width: compact ? 26 : 30,
          height: compact ? 26 : 30,
          borderRadius: 99,
          background: "#fff",
          border: "1px solid #8798AA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(15,23,42,0.14)",
          color: "#3B4B63",
          flexShrink: 0,
        }}
      >
        {allOpen ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
      </button>
      <div style={{ flex: 1, minWidth: 24, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            gap: compact ? 12 : 18,
            alignItems: "center",
            // Compact keeps everything on one row (no second-line spill on DWS
            // office); the default layout still wraps on narrower dashboards.
            flexWrap: compact ? "nowrap" : "wrap",
            justifyContent: "center",
          }}
        >
          {indexes.map((idx) => (
            <Tile
              key={idx.id}
              datum={idx}
              isOverall={false}
              expanded={!!open[idx.id]}
              onToggle={() => toggle(idx.id)}
              color={tileColors[idx.id]}
              surfaceTreatment={surfaceTreatment}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default IndexScoreSummary;
