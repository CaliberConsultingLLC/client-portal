"use client";

/**
 * Segment Breakdown — DWS Field redesign pilot only.
 *
 * One replicable section per segment dimension: an index rail (the exact
 * attached tab strip from the Basin Report / `ee-department-report.tsx` field
 * layout, via the shared `IndexRailTabs`) + a ranked funnel of the segment
 * values on the right, and a statement heatmap below, both driven by the same
 * rail selection. Four dimensions stack on this page — Job Category,
 * Department, Role, Tenure — each rendered by `SegmentDimensionSection` with
 * its own independent index-rail selection and collapse/expand state, but all
 * sharing the single basin/department picker at the top of the page.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePersistedDashboardFilter } from "@/hooks/use-persisted-dashboard-filter";
import {
  EEReportStyles,
  BasinSurfaceStyles,
  SectionWithVerticalLabel,
  EmbeddedFilterCard,
  FilterStack,
  PillOptionRow,
  IndexRailTabs,
  isLightBand,
  makeGradientColor,
} from "./ee-report-kit";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";
import type {
  SegmentBreakdownProjection,
  SegmentBreakdownStatementRow,
  SegmentBreakdownValue,
} from "./ee-live-projections";

function textFor(color: string) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

// Field job-category names are compound industry terms (Roughneck, Leadhand,
// Greenhat, Derrickman…) that generic browser hyphenation dictionaries don't
// recognize, so `hyphens:auto` falls back to breaking wherever it fits rather
// than at the real word boundary. Soft hyphens (\u00AD) pin the correct break
// point explicitly; anything not in this list still gets `hyphens:auto` as a
// reasonable fallback for ordinary words.
const SOFT_HYPHEN = "\u00AD";
const JOB_TITLE_HYPHENS: Record<string, string> = {
  roughneck: `Rough${SOFT_HYPHEN}neck`,
  leadhand: `Lead${SOFT_HYPHEN}hand`,
  greenhat: `Green${SOFT_HYPHEN}hat`,
  floorhand: `Floor${SOFT_HYPHEN}hand`,
  derrickman: `Der${SOFT_HYPHEN}rick${SOFT_HYPHEN}man`,
  derrickhand: `Der${SOFT_HYPHEN}rick${SOFT_HYPHEN}hand`,
  toolpusher: `Tool${SOFT_HYPHEN}push${SOFT_HYPHEN}er`,
  foreman: `Fore${SOFT_HYPHEN}man`,
  supervisor: `Su${SOFT_HYPHEN}per${SOFT_HYPHEN}vi${SOFT_HYPHEN}sor`,
  operator: `Op${SOFT_HYPHEN}er${SOFT_HYPHEN}a${SOFT_HYPHEN}tor`,
  driller: `Drill${SOFT_HYPHEN}er`,
};

function hyphenateLabel(label: string): string {
  return label
    .split(" ")
    .map((word) => JOB_TITLE_HYPHENS[word.toLowerCase()] ?? word)
    .join(" ");
}

function SegmentFunnel({
  segments,
  scoreByKey,
  scoreColor,
  statementsOpen,
  onToggleStatements,
}: {
  segments: SegmentBreakdownValue[];
  scoreByKey: Record<string, number>;
  scoreColor: (value: number) => string;
  statementsOpen: boolean;
  onToggleStatements: () => void;
}) {
  const ranked = segments
    .map((segment) => ({ ...segment, score: scoreByKey[segment.key] ?? 0 }))
    .sort((left, right) => right.score - left.score);
  const min = Math.min(...ranked.map((row) => row.score));
  const max = Math.max(...ranked.map((row) => row.score));

  // Density tiers: with many segments (e.g. every Department inside a Division)
  // the default 42px rows make the funnel scroll off the page. Rows compress in
  // steps as the count grows — bar height, gap, padding and type all shrink —
  // while staying readable (the label + number stay legible at the tightest
  // tier). Widest tier keeps the original spacious look for small sets.
  const count = ranked.length;
  const tier = count > 16 ? 3 : count > 11 ? 2 : count > 7 ? 1 : 0;
  const rowGap = [14, 10, 7, 5][tier];
  const rowMinHeight = [42, 34, 28, 24][tier];
  const rowPad = ["12px 18px", "9px 16px", "7px 14px", "5px 12px"][tier];
  const labelFont = [10, 10, 9.5, 9][tier];
  const scoreFont = [14.5, 13.5, 12.5, 11.5][tier];
  const bodyPadV = [30, 24, 20, 16][tier];

  return (
    <div className="card" style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "visible" }}>
      <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: rowGap, padding: `${bodyPadV}px 26px` }}>
        {ranked.map((row) => {
          const t = max === min ? 1 : (row.score - min) / (max - min);
          const width = 46 + t * 52;
          const bg = scoreColor(row.score);
          const ink = textFor(bg);
          return (
            <div
              key={row.key}
              style={{
                width: `${width}%`,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: rowPad,
                borderRadius: 10,
                background: bg,
                color: ink,
                minHeight: rowMinHeight,
                outline: "1px solid rgba(0,0,0,0.18)",
                boxShadow: "0 2px 4px rgba(15,23,42,.14)",
              }}
            >
              <span style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: labelFont,
                    fontWeight: 700,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "#1C252A",
                  }}
                >
                  {row.label}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.6, color: "#1C252A", flexShrink: 0 }}>n={row.n}</span>
              </span>
              <span style={{ fontSize: scoreFont, fontWeight: 800, flexShrink: 0 }}>{row.score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {/* Straddles the funnel card's own bottom border, centered on the
          funnel only (not the rail or the page), so it reads as "pulling
          the statement detail down out of this card" rather than a
          floating, page-wide control. */}
      <button
        type="button"
        onClick={onToggleStatements}
        title={statementsOpen ? "Collapse statement detail" : "Expand statement detail"}
        aria-label={statementsOpen ? "Collapse statement detail" : "Expand statement detail"}
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translate(-50%, 50%)",
          zIndex: 2,
          width: 30,
          height: 30,
          borderRadius: 99,
          background: "#fff",
          border: "1px solid #8798AA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(15,23,42,0.14)",
          color: "#3B4B63",
        }}
      >
        {statementsOpen ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
      </button>
    </div>
  );
}

function SegmentHeatmap({
  indexName,
  segments,
  rows,
  scoreColor,
  accent,
}: {
  indexName: string;
  segments: SegmentBreakdownValue[];
  rows: SegmentBreakdownStatementRow[];
  scoreColor: (value: number) => string;
  accent: string;
}) {
  // With many columns (e.g. every Department in a Division) horizontal headers
  // force wide columns and a scrollbar. Past a threshold the headers rotate to
  // vertical text so columns can be narrow, the table fits without scrolling,
  // and the header band grows to fit the tallest rotated label.
  const longestLabel = Math.max("Overall".length, ...segments.map((segment) => segment.label.length));
  const manyColumns = segments.length > 6;
  // A touch more width per column than before (was 40) so vertical headers and
  // chips aren't squished when a Division has many Departments.
  const dataColPx = manyColumns
    ? 48
    : Math.min(92, Math.max(64, longestLabel * 6.5 + 20));
  // Cap the statement (first) column. In a fixed-layout table it was the only
  // column without an explicit width, so it absorbed all leftover space and
  // blew the first column out huge next to the narrow data columns. Give it a
  // bounded width so the extra room flows to the data columns instead.
  const statementColPx = manyColumns ? 220 : 300;
  // Sized for the longest label wrapped to ~2 vertical lines (rather than one
  // very tall single line), which keeps the header band shorter and the
  // columns compact. ~6.2px/char over two lines, with a floor/ceiling.
  const verticalHeaderHeight = Math.min(150, Math.max(88, Math.ceil(longestLabel / 2) * 6.2 + 34));

  const headerWrapStyle: CSSProperties = {
    textAlign: "center",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    hyphens: "auto",
    WebkitHyphens: "auto",
    lineHeight: 1.2,
    padding: "12px 6px",
  };

  const verticalHeaderCellStyle: CSSProperties = {
    height: verticalHeaderHeight,
    padding: "10px 0 12px",
    verticalAlign: "bottom",
    textAlign: "center",
  };

  // A rotated label: vertical text reading bottom→top, centered in a narrow
  // column. Used only when `manyColumns` is true. `whiteSpace:normal` +
  // `overflowWrap` lets multi-word labels (e.g. "Customer Service",
  // "Production Control") wrap to a second vertical line inside the capped
  // header height instead of forcing a very tall single line. Soft-hyphenated
  // long single words can break too. Font is a hair smaller than before (11).
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
        }}
      >
        {hyphenateLabel(text)}
      </span>
    </div>
  );

  // Cells stay on a plain white grid; only a rounded chip behind the number
  // carries the score color, sized as a share of the (now capped) column
  // width so every cell reads as the same size with even breathing room.
  const chip = (value: number, keySuffix: string, groupStart = false) => {
    const bg = scoreColor(value);
    return (
      <td
        key={keySuffix}
        className={`cell${groupStart ? " col-group-start" : ""}`}
        style={{ background: "#fff", padding: "6px 4px", borderLeft: groupStart ? undefined : "1px solid var(--border-subtle)" }}
      >
        <div
          style={{
            width: "86%",
            margin: "0 auto",
            padding: "7px 0",
            borderRadius: 9,
            background: bg,
            color: textFor(bg),
            fontSize: manyColumns ? 12 : 13,
            fontWeight: 800,
          }}
        >
          {value.toFixed(1)}
        </div>
      </td>
    );
  };

  return (
    <div className="stmt-wrap" style={{ marginTop: 14, borderTop: `3px solid ${accent}` }}>
      <table className="stmt-table" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: statementColPx }} />
          {segments.map((segment) => (
            <col key={segment.key} style={{ width: dataColPx }} />
          ))}
          <col style={{ width: dataColPx }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left", verticalAlign: "bottom" }}>{indexName} statements</th>
            {segments.map((segment) =>
              manyColumns ? (
                <th key={segment.key} style={{ ...verticalHeaderCellStyle, borderLeft: "1px solid var(--border-subtle)" }}>
                  <VerticalLabel text={segment.label} />
                </th>
              ) : (
                <th key={segment.key} style={{ ...headerWrapStyle, borderLeft: "1px solid var(--border-subtle)" }}>
                  {hyphenateLabel(segment.label)}
                </th>
              )
            )}
            {manyColumns ? (
              <th className="col-group-start" style={verticalHeaderCellStyle}>
                <VerticalLabel text="Overall" ink="#152238" />
              </th>
            ) : (
              <th className="col-group-start" style={{ ...headerWrapStyle, color: "#152238" }}>Overall</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="stmt-row" key={rowIndex}>
              <td className="stmt" style={{ fontSize: 12.5 }}>{row.text}</td>
              {segments.map((segment) => chip(row.scores[segment.key] ?? 0, segment.key))}
              {chip(row.overall, "overall", true)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SegmentDimensionSection({
  projection,
  deptId,
  dept,
  registryOn,
  order,
  basinReportSurface = false,
}: {
  projection: SegmentBreakdownProjection;
  deptId: string;
  dept: { id: string; name: string; location?: string; responses: number };
  registryOn: boolean;
  order: number;
  basinReportSurface?: boolean;
}) {
  const scoreColor = useMemo(
    () => makeGradientColor(projection.scale.min, projection.scale.max),
    [projection.scale.min, projection.scale.max]
  );
  const unit = projection.byUnit[deptId];

  // Statement detail starts expanded — the toggle button sits right on the
  // funnel's bottom border, so starting collapsed put it directly under the
  // "Download segment breakdown" export control above and made it hard to
  // reach. Each dimension section keeps this (and the index-rail selection
  // below) fully independent of its siblings.
  const [statementsOpen, setStatementsOpen] = useState(true);

  const [activeIndexId, setActiveIndexId] = useState(unit?.indexes[0]?.id ?? "");
  useEffect(() => {
    if (unit && unit.indexes.length > 0 && !unit.indexes.find((item) => item.id === activeIndexId)) {
      setActiveIndexId(unit.indexes[0].id);
    }
  }, [unit, activeIndexId]);

  if (!unit) return null;

  const activeIndex = unit.indexes.find((item) => item.id === activeIndexId) ?? unit.indexes[0] ?? null;
  const accent = activeIndex ? scoreColor(activeIndex.score) : "#8798AA";
  const funnelScores = activeIndex ? unit.funnelByIndex[activeIndex.id] ?? {} : {};
  const statementRows = activeIndex ? unit.statementsByIndex[activeIndex.id] ?? [] : [];

  return (
    <RegisteredVisualExportFrame
      enabled={registryOn}
      order={order}
      label="Download segment breakdown"
      filename={buildDashboardExportFilename({
        client: "dws",
        perspective: `${dept.name}-${projection.segmentLabel}-breakdown`,
        campaign: projection.current.label,
      })}
    >
      <SectionWithVerticalLabel label={`${projection.segmentLabel} Comparison`} active={basinReportSurface}>
      <div>
        {!basinReportSurface ? (
          <p className="slabel" style={{ margin: "0 0 8px" }}>{projection.segmentLabel} Comparison</p>
        ) : null}

        {/* minHeight is a floor only — the row grows to fit more segments;
            without it, a short segment list would crush the index tabs. */}
        <div style={{ display: "flex", gap: 0, alignItems: "stretch", minHeight: 300 }}>
          <IndexRailTabs indexes={unit.indexes} activeId={activeIndex?.id ?? ""} onSelect={setActiveIndexId} surfaceTreatment={basinReportSurface ? "1b" : undefined} />
          <SegmentFunnel
            segments={unit.segments}
            scoreByKey={funnelScores}
            scoreColor={scoreColor}
            statementsOpen={statementsOpen}
            onToggleStatements={() => setStatementsOpen((v) => !v)}
          />
        </div>

        {/* DESIGN RULE: space between stacked visuals (funnel → heatmap) is
            doubled to 40px, matching the same rule applied to Basin
            Report's Index Scores/Index Comparison/Statement Results stack
            and Basin Comparison's stacked sections. Was 20px — just enough
            clearance for the toggle button (which straddles the funnel
            card's border above) to clear the heatmap below; the extra room
            still reads as one continuous pour rather than two disconnected
            sections, just with more breathing room. */}
        <div
          style={{
            marginTop: 40,
            maxHeight: statementsOpen ? 3000 : 0,
            opacity: statementsOpen ? 1 : 0,
            overflow: "hidden",
            transition: "max-height .38s cubic-bezier(.4,0,.2,1), opacity .28s ease",
          }}
        >
          <SegmentHeatmap
            indexName={activeIndex?.name ?? ""}
            segments={unit.segments}
            rows={statementRows}
            scoreColor={scoreColor}
            accent={accent}
          />
        </div>
      </div>
      </SectionWithVerticalLabel>
    </RegisteredVisualExportFrame>
  );
}

export function EESegmentBreakdown({
  data,
  unitLabel = "Basin",
  campaignValue,
  campaignOptions,
  onCampaignChange,
  filtersPortalId,
  titleSuffixPortalId,
  headerPortalId,
  chromeless = true,
  basinReportSurface = false,
  filterPersistenceKey,
}: {
  data: SegmentBreakdownProjection[];
  unitLabel?: string;
  campaignValue?: string;
  campaignOptions?: string[];
  onCampaignChange?: (campaign: string) => void;
  filtersPortalId?: string;
  titleSuffixPortalId?: string;
  headerPortalId?: string;
  chromeless?: boolean;
  /** Basin group surface treatment "1b" — shared canvas tint, soft blue
   * borders/shadows, and vertical section labels used across the whole
   * Basin group (Basin Report / Basin Breakdown / Basin Comparison). */
  basinReportSurface?: boolean;
  /** Cookie key so unit/dimension filters restore when revisiting this report. */
  filterPersistenceKey?: string;
}) {
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);

  // Rule of two everywhere: never list a filter option the user can't open.
  // - Unit picker: only units with ≥2 segments for the active dimension.
  // - Dimension switcher: only dimensions with ≥2 segments for the selected unit.
  const allUnits = data[0]?.departments ?? [];

  const [activeDimension, setActiveDimension] = usePersistedDashboardFilter(
    filterPersistenceKey,
    "activeDimension",
    () => data[0]?.segmentLabel ?? ""
  );
  const [deptId, setDeptId] = usePersistedDashboardFilter(
    filterPersistenceKey,
    "deptId",
    () => allUnits[0]?.id ?? ""
  );

  const unitsForActiveDimension = useMemo(() => {
    const projection =
      data.find((item) => item.segmentLabel === activeDimension) ?? data[0] ?? null;
    if (!projection) return [];
    return allUnits.filter((unit) => (projection.byUnit[unit.id]?.segments.length ?? 0) >= 2);
  }, [data, allUnits, activeDimension]);

  useEffect(() => {
    if (!unitsForActiveDimension.find((item) => item.id === deptId)) {
      setDeptId(unitsForActiveDimension[0]?.id ?? "");
    }
  }, [unitsForActiveDimension, deptId]);

  const dept =
    unitsForActiveDimension.find((item) => item.id === deptId) ?? unitsForActiveDimension[0];

  const visibleSections = useMemo(() => {
    if (!dept) {
      // Before a unit is resolved, keep dimensions that work for any unit so
      // the first paint can still pick a valid starting dimension.
      return data.filter((projection) =>
        allUnits.some((unit) => (projection.byUnit[unit.id]?.segments.length ?? 0) >= 2)
      );
    }
    return data.filter((projection) => (projection.byUnit[dept.id]?.segments.length ?? 0) >= 2);
  }, [data, allUnits, dept]);

  useEffect(() => {
    if (!visibleSections.find((projection) => projection.segmentLabel === activeDimension)) {
      setActiveDimension(visibleSections[0]?.segmentLabel ?? "");
    }
  }, [visibleSections, activeDimension]);

  const activeProjection =
    visibleSections.find((projection) => projection.segmentLabel === activeDimension) ??
    visibleSections[0];

  const departments = unitsForActiveDimension;

  const [filtersPortalNode, setFiltersPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !filtersPortalId) {
      setFiltersPortalNode(null);
      return;
    }
    setFiltersPortalNode(document.getElementById(filtersPortalId));
  }, [chromeless, filtersPortalId]);

  const [titleSuffixPortalNode, setTitleSuffixPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !titleSuffixPortalId) {
      setTitleSuffixPortalNode(null);
      return;
    }
    setTitleSuffixPortalNode(document.getElementById(titleSuffixPortalId));
  }, [chromeless, titleSuffixPortalId]);

  const [headerPortalNode, setHeaderPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !headerPortalId) {
      setHeaderPortalNode(null);
      return;
    }
    setHeaderPortalNode(document.getElementById(headerPortalId));
  }, [chromeless, headerPortalId]);

  if (!departments.length || !dept || !visibleSections.length || !activeProjection) {
    return (
      <div className="canvas" style={chromeless ? { display: "block", background: "#fff" } : undefined}>
        <EEReportStyles />
        <p style={{ color: "#6E7E96", fontSize: 14 }}>No segment breakdown data is available for this campaign yet.</p>
      </div>
    );
  }

  const basinSurfaceActive = chromeless && basinReportSurface;

  // The basin/department picker is a genuine filter — it scopes every
  // section on the page to one unit — so it lives in the Filters tab like
  // every other report's filter, not in the header.
  const railControls = (
    <FilterStack>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {campaignValue && campaignOptions && campaignOptions.length > 1 && onCampaignChange ? (
          <EmbeddedFilterCard title="Campaign Selection">
            <PillOptionRow
              value={campaignValue}
              onChange={onCampaignChange}
              options={[...campaignOptions].reverse().map((campaign) => ({ id: campaign, label: campaign }))}
            />
          </EmbeddedFilterCard>
        ) : null}
        <EmbeddedFilterCard title={unitLabel}>
          <PillOptionRow
            value={deptId}
            onChange={setDeptId}
            options={departments.map((item) => ({ id: item.id, label: item.name }))}
          />
          <p className="rs-hint" style={{ margin: "9px 2px 0" }}>
            {dept.location ? `${dept.location} · ` : ""}
            {dept.responses} responses
          </p>
        </EmbeddedFilterCard>
      </div>
    </FilterStack>
  );

  // The dimension switcher is NOT a filter — it swaps in a different version
  // of the report (Job Category vs. Department vs. Role vs. Tenure), so it
  // stays out of the Filters tab. It lives in the shell header instead, next
  // to the title, like a view switcher rather than a scope — same header
  // slot every other chromeless report portals its KPI strip into.
  const dimensionSwitcher = visibleSections.length > 1 ? (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#8798AA",
          whiteSpace: "nowrap",
        }}
      >
        Breakdown
      </span>
      <PillOptionRow
        value={activeDimension}
        onChange={setActiveDimension}
        options={visibleSections.map((projection) => ({ id: projection.segmentLabel, label: projection.segmentLabel }))}
      />
    </div>
  ) : null;

  return (
    <div
      className={basinSurfaceActive ? "canvas basin-surface-1b" : "canvas"}
      style={chromeless ? { display: "block", background: basinSurfaceActive ? "#F4F4EF" : "#fff" } : undefined}
    >
      <EEReportStyles />
      {basinSurfaceActive ? <BasinSurfaceStyles /> : null}
      {chromeless && filtersPortalNode ? createPortal(railControls, filtersPortalNode) : null}
      {titleSuffixPortalNode
        ? createPortal(
            <>
              <span style={{ color: "#8798AA", fontWeight: 700 }}> — </span>
              <span style={{ color: "#3B4B63" }}>{dept.name}</span>
            </>,
            titleSuffixPortalNode
          )
        : null}
      {chromeless && headerPortalNode && dimensionSwitcher ? createPortal(dimensionSwitcher, headerPortalNode) : null}

      <div style={{ maxWidth: 1320, margin: chromeless ? undefined : "0 auto", padding: chromeless ? undefined : "30px 30px 56px" }}>
        {!chromeless && dimensionSwitcher ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 14,
                border: "1px solid #D4DAD6",
                background: "#F4F6F4",
              }}
            >
              {dimensionSwitcher}
            </div>
          </div>
        ) : null}
        <SegmentDimensionSection
          key={activeProjection.segmentLabel}
          projection={activeProjection}
          deptId={dept.id}
          dept={dept}
          registryOn={registryOn}
          order={5}
          basinReportSurface={basinSurfaceActive}
        />
      </div>
    </div>
  );
}

export default EESegmentBreakdown;
