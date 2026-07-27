"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { EEReportStyles, BasinSurfaceStyles, SectionWithVerticalLabel, HeaderKpiPortal, dwsScoreColor, makeGradientColor, BrandComparisonChart } from "./ee-report-kit";
import { EE_GUIDANCE_RAIL_STYLE, EE_PERSPECTIVE_CANVAS_STYLE, EE_PERSPECTIVE_MAIN_STYLE } from "./ee-executive-rail";
import { clampDeltaVisual, computeDeltaAxis, defaultComparisonId } from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";
import { GuidancePinRail } from "@/components/dashboard/guidance-pin-rail";
import { IndexToggleColumn, ComparisonHeatmap } from "./ee-comparison-heatmap";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LocationCell { current: number; comparisons: Record<string, number> }
interface Statement { id: string; text: string; byLocation: Record<string, LocationCell>; org?: LocationCell }
/** Person-average score for one population: the current campaign plus every comparison. */
interface ScoreCell { current: number | null; comparisons: Record<string, number | null> }
/** Person-average scores per group, plus the org's own direct person average. */
interface ScoreBlock { byGroup: Record<string, ScoreCell>; org: ScoreCell }
interface Index { id: string; name: string; statements: Statement[]; score?: ScoreBlock }
interface Comparison { id: string; label: string; labelLong: string }
interface Location { id: string; name: string }
interface Data {
  overall?: ScoreBlock;
  client: { name: string; tagline?: string; logoUrl?: string };
  current: { id: string; label: string; labelLong: string; responseRate?: number };
  comparisons: Comparison[];
  scale: { min: number; mid: number; max: number };
  display?: { barAxis?: { min: number; max: number; ticks?: number[] }; deltaAxis?: { min: number; max: number; ticks?: number[] } };
  locations: Location[];
  indexes: Index[];
}

// ─── Demo fixture ─────────────────────────────────────────────────────────────
// Deterministic synthetic data standing in for the Firestore-fed `data` prop.
// Numbers are reproducible from the anchors below; the SHAPE matches the
// contract in HANDOFF.md. Replace with a real adapter when wiring live data;
// keep the adapter separate so this component stays pure presentation.

const DC_DEPARTMENTS = [
  { id: "ship",  name: "Shipping & Receiving",         base: 67.0, yoy:  2.1 },
  { id: "sales", name: "Sales",                         base: 67.0, yoy:  8.3 },
  { id: "pcs",   name: "Production Control & Sourcing", base: 39.5, yoy: -7.7 },
  { id: "prod",  name: "Production",                    base: 73.0, yoy:  4.0 },
  { id: "it",    name: "IT",                            base: 89.0, yoy:  6.0 },
  { id: "cs",    name: "Customer Service",              base: 67.0, yoy:  1.5 },
  { id: "acct",  name: "Accounting",                    base: 56.0, yoy:  5.5 },
];

const DC_INDEX_DEFS: { id: string; name: string; off: number; yoyScale: number; statements: string[] }[] = [
  {
    id: "culture", name: "Culture", off: 0, yoyScale: 1,
    statements: [
      "Top Flight delivers on its promises to its customers",
      "Leaders at Top Flight demonstrate professional integrity",
      "My department receives good cooperation and support from other locations",
      "Top Flight delivers on its promises to its employees",
      "Top Flight employees work well together",
      "Top Flight encourages open and honest communication",
      "People at Top Flight are allowed to challenge processes and share ideas",
      "People at Top Flight treat each other with respect",
      "People at Top Flight take responsibility for their actions and results",
    ],
  },
  {
    id: "engagement", name: "Engagement", off: 3, yoyScale: 1.1,
    statements: [
      "I am willing to put in extra effort to help Top Flight succeed",
      "I am proud to work at Top Flight",
      "I would recommend Top Flight as a great place to work",
      "My work gives me a sense of personal accomplishment",
      "I feel motivated to do more than what is required of me",
      "I feel energized by the work I do each day",
      "Top Flight inspires me to do my best work",
      "I rarely think about looking for a job at another company",
    ],
  },
  {
    id: "intent", name: "Intent to Stay", off: -2, yoyScale: 0.8,
    statements: [
      "I expect to be working at Top Flight two years from now",
      "My future at Top Flight looks bright",
      "Top Flight gives me good reasons to stay",
      "I see a clear path to grow my career here",
      "I rarely think about leaving Top Flight",
      "I would turn down a similar job offered elsewhere",
    ],
  },
  {
    id: "manager", name: "Manager", off: 5, yoyScale: 0.9,
    statements: [
      "My manager treats me with respect",
      "I trust my manager",
      "My manager cares about me as a person",
      "My manager communicates clearly",
      "My manager removes obstacles so I can do my work",
      "My manager recognizes my contributions",
      "My manager gives me useful feedback",
      "My manager helps me grow and develop",
    ],
  },
];

const DATA: Data = (() => {
  const hash = (str: string) => {
    let x = 0;
    for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0;
    return x;
  };
  const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const rd = (n: number) => Math.round(n * 10) / 10;

  const indexes: Index[] = DC_INDEX_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    statements: def.statements.map((text, sIdx) => {
      const id = `${def.id}-${sIdx + 1}`;
      const byLocation: Record<string, LocationCell> = {};
      DC_DEPARTMENTS.forEach((d) => {
        const bias = def.id === "culture" ? 0 : ((hash(d.id + def.id) % 70) / 10) - 3.5;
        const target = cl(d.base + def.off + bias, 26, 97);
        const jit = ((hash(d.id + id) % 90) / 10) - 4.5;
        const cur = rd(cl(target + jit, 22, 98));
        const yoy = d.yoy * def.yoyScale;
        const yj = ((hash(id + d.id + "y") % 40) / 10) - 2.0;
        const jul = rd(cl(cur - (yoy + yj), 18, 99));
        const feb = rd(cl(cur - (yoy * 0.55 + yj * 0.5), 18, 99));
        byLocation[d.id] = { current: cur, comparisons: { jul, feb } };
      });
      return { id, text, byLocation };
    }),
  }));

  return {
    client: { name: "Top Flight", tagline: "100TH ANNIVERSARY" },
    current: { id: "oct25", label: "Oct 2025", labelLong: "October 2025", responseRate: 0.71 },
    comparisons: [
      { id: "jul", label: "Jul-24", labelLong: "JUL 2024" },
      { id: "feb", label: "Feb-25", labelLong: "FEB 2025" },
    ],
    scale: { min: 60, mid: 72.5, max: 85 },
    display: {
      barAxis: { min: 30, max: 90, ticks: [40, 60, 80] },
      deltaAxis: { min: -10, max: 10, ticks: [-10, 0, 10] },
    },
    locations: DC_DEPARTMENTS.map((d) => ({ id: d.id, name: d.name })),
    indexes,
  };
})();

// ─── Utilities ────────────────────────────────────────────────────────────────

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const r1    = (n: number) => Math.round(n * 10) / 10;
const mean  = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
const f1    = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1);

function dStyle(d: number) {
  if (d >= 6)     return { bg: "#8BA399", fg: "#fff" };
  if (d >= 4)     return { bg: "#9CB2A8", fg: "#fff" };
  if (d >= 2)     return { bg: "#B5C5BE", fg: "#1F332A" };
  if (d >= 0.05)  return { bg: "#E2E9E5", fg: "#355348" };
  if (d <= -3)    return { bg: "#B49F9C", fg: "#fff" };
  if (d <= -1)    return { bg: "#C8B9B6", fg: "#4E3834" };
  if (d <= -0.05) return { bg: "#E8DFDE", fg: "#5E4441" };
  return { bg: "#E2E8EF", fg: "#3B4B63" };
}

// dark vs light text over a band color, by luminance
function readableText(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C252A" : "#fff";
}

// ─── RailSection ──────────────────────────────────────────────────────────────

function RailSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #8798AA" }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: "0.18em", color: "#6E7E96" }}>{title}</span>
        <ChevronRight className="h-4 w-4 transition-transform duration-200" style={{ color: "#6E7E96", transform: open ? "rotate(90deg)" : undefined }} />
      </button>
      {open && <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid #D3DDE7" }}>{children}</div>}
    </div>
  );
}


// ─── Charts ───────────────────────────────────────────────────────────────────

function DeptDeltaChart({ rows, axis }: { rows: { name: string; delta: number }[]; axis: { min: number; max: number; ticks: number[] } }) {
  const ROW_HEIGHT = 34;
  const span = axis.max - axis.min;
  const xp = (v: number) => `${((clamp(v, axis.min, axis.max) - axis.min) / span) * 100}%`;
  const z0 = ((0 - axis.min) / span) * 100;
  return (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "44%", right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 1 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: xp(t), borderLeft: t === 0 ? "2px solid #8798AA" : "1px dashed #D3DDE7" }} />)}
        </div>
        {rows.map((r, i) => {
          const s = dStyle(r.delta);
          const pos = r.delta >= 0;
          const tone = pos
            ? { fg: "#2F6A45", border: "#9BC6A9" }
            : { fg: "#8A3D3A", border: "#D5A3A0" };
          const visualDelta = clampDeltaVisual(r.delta, axis);
          const w = Math.abs((visualDelta / span) * 100);
          const rawLeft = pos ? z0 : z0 - w;
          const left = Math.max(0, Math.min(100 - w, rawLeft));
          const width = Math.min(w, 100 - left);
          const labelAnchor = pos
            ? Math.min(99, left + width + 2)
            : Math.max(1, left - 2);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 44%) minmax(0, 1fr)", minHeight: ROW_HEIGHT, alignItems: "center", position: "relative" }}>
            <div title={r.name} style={{ padding: "3px 12px 3px 0", alignSelf: "center", fontSize: 12.5, lineHeight: 1.18, fontWeight: 500, color: "#152238", zIndex: 2 }}>{r.name}</div>
            <div style={{ position: "relative", height: 24, alignSelf: "center", zIndex: 2, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: s.bg, borderRadius: 3, transition: "left .55s cubic-bezier(.34,1.1,.64,1), width .55s cubic-bezier(.34,1.1,.64,1)" }} />
              <div style={{ position: "absolute", top: "50%", transform: pos ? "translate(-100%, -50%)" : "translateY(-50%)", left: `${labelAnchor}%`, background: "#FFFFFF", color: tone.fg, border: `1px solid ${tone.border}`, fontSize: 11, fontWeight: 800, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{f1(r.delta)}</div>
            </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 44%) minmax(0, 1fr)", marginTop: 4 }}>
        <div />
        <div style={{ position: "relative", height: 20 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", left: xp(t), transform: "translateX(-50%)", fontSize: 11, color: "#152238" }}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── Perspective ──────────────────────────────────────────────────────────────

const ALL = "__ALL__";

export function EELocationComparison({
  data,
  title = "Brand Comparison",
  primaryLabel = "Brand",
  dashboardInstanceId,
  canEditGuidance = false,
  executiveRail,
  indexId: controlledIndexId,
  onIndexId,
  compId: controlledCompId,
  onCompId,
  statementId: controlledStatementId,
  onStatementId,
  benchmarkLabel = "CSG",
  fieldLayout = false,
  allIndexesTab = false,
  chromeless = false,
  headerPortalId,
  basinReportSurface = false,
}: {
  data: Data;
  title?: string;
  primaryLabel?: string;
  benchmarkLabel?: string;
  dashboardInstanceId?: string;
  canEditGuidance?: boolean;
  executiveRail?: React.ReactNode;
  indexId?: string;
  onIndexId?: (value: string) => void;
  compId?: string;
  onCompId?: (value: string) => void;
  statementId?: string;
  onStatementId?: (value: string) => void;
  fieldLayout?: boolean;
  /** DESIGN RULE (Deep Well Services): lead the inline index rail with an
   * "All Indexes" tab — the same roll-up tab the breakdown funnels use — and
   * open on it. CSG hasn't adopted this yet and keeps one index at a time. */
  allIndexesTab?: boolean;
  chromeless?: boolean;
  headerPortalId?: string;
  /** Basin group surface treatment "1b" — shared canvas tint, soft blue
   * borders/shadows, and vertical section labels used across the whole
   * Basin group (Basin Report / Basin Breakdown / Basin Comparison). */
  basinReportSurface?: boolean;
}) {
  const { client, current, comparisons, scale, indexes, locations } = data;
  const sc = makeGradientColor(scale.min, scale.max);
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const exportFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `${title}-${section}`, campaign: current.label });

  const [localIndexId, setLocalIndexId] = useState("");
  const [localCompId, setLocalCompId] = useState(() => defaultComparisonId(comparisons));
  const indexIdRaw = controlledIndexId ?? localIndexId;
  const setIndexId = onIndexId ?? setLocalIndexId;
  // Field layout drives one index at a time via an inline toggle, unless the
  // rail carries an All Indexes tab — then "" is a real, selectable state.
  const railHasAllIndexes = allIndexesTab && indexes.length > 1;
  const indexId = fieldLayout && !railHasAllIndexes ? (indexIdRaw || indexes[0]?.id || "") : indexIdRaw;
  const compId = controlledCompId ?? localCompId;
  const setCompId = onCompId ?? setLocalCompId;
  const [localStatementId, setLocalStatementId] = useState(ALL);
  const statementId = controlledStatementId ?? localStatementId;
  const setStatementId = onStatementId ?? setLocalStatementId;

  const selectedIndexes = useMemo(() => {
    if (!indexId) return indexes;
    const selected = indexes.find((item) => item.id === indexId);
    return selected ? [selected] : indexes;
  }, [indexes, indexId]);
  const idx = selectedIndexes[0] ?? indexes[0];
  // Inline rail contents: the roll-up tab (id "") first, then every index.
  const railTabs: Array<{ id: string; name: string }> = railHasAllIndexes
    ? [{ id: "", name: "All Indexes" }, ...indexes.map((item) => ({ id: item.id, name: item.name }))]
    : indexes.map((item) => ({ id: item.id, name: item.name }));
  const comp = comparisons.find(c => c.id === compId) ?? comparisons[0];
  const hasComparison = Boolean(comp);
  const comparedToText = comp ? ` · compared to ${comp.label}` : "";
  const versusText = comp ? ` vs ${comp.label}` : "";

  // changing index falls back to the index-average view
  useEffect(() => { setStatementId(ALL); }, [indexId, setStatementId]);

  const activeStatement = statementId === ALL || selectedIndexes.length !== 1
    ? null
    : idx.statements.find((statement) => statement.id === statementId) ?? null;

  // One index selected scores that index; "All indexes" scores every statement in
  // a single pass. Both are person averages precomputed by the projection.
  const scopeScore = selectedIndexes.length === 1 ? selectedIndexes[0]?.score : data.overall;

  const rows = useMemo(() => locations.map(d => {
    let cur: number, prev: number | null;
    const cell = activeStatement ? activeStatement.byLocation[d.id] : scopeScore?.byGroup?.[d.id];
    cur = typeof cell?.current === "number" ? r1(cell.current) : 0;
    const prior = cell?.comparisons?.[compId];
    prev = typeof prior === "number" && prior > 0 ? r1(prior) : null;
    return { id: d.id, name: d.name, value: cur, prev, delta: prev == null ? null : r1(cur - prev) };
  }), [locations, scopeScore, activeStatement, compId]);

  const deltaAxis = useMemo(() => {
    const fallback = data.display?.deltaAxis
      ? { ...data.display.deltaAxis, ticks: data.display.deltaAxis.ticks ?? [-10, 0, 10] }
      : { min: -10, max: 10, ticks: [-10, 0, 10] };
    const validRows = rows.filter((row) => row.delta != null).map((row) => ({ delta: row.delta as number }));
    return computeDeltaAxis(validRows, fallback);
  }, [data.display?.deltaAxis, rows]);

  // Company average is the direct average of every respondent — never the mean of
  // the location rows on the chart.
  const orgCell = activeStatement ? activeStatement.org : scopeScore?.org;
  const overallAvg = useMemo(
    () => (typeof orgCell?.current === "number" ? r1(orgCell.current) : 0),
    [orgCell]
  );

  // Same 5-point floor/ceil rounding as the Basin Report's bar chart, sized
  // to this dataset's actual range (bars + the org-average line) rather than
  // a fixed wide window — keeps the two "compare rows to an average" charts
  // pixel-for-pixel consistent instead of drifting apart.
  const barAxis = useMemo(() => {
    const allValues = [...rows.map((row) => row.value), overallAvg];
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const min = Number.isFinite(rawMin) ? Math.floor((rawMin - 2) / 5) * 5 : 0;
    const max = Number.isFinite(rawMax) ? Math.ceil((rawMax + 2) / 5) * 5 : 100;
    const ticks: number[] = [];
    for (let tick = min; tick <= max; tick += 5) ticks.push(tick);
    return { min, max, ticks: ticks.length > 0 ? ticks : [0, 20, 40, 60, 80, 100] };
  }, [rows, overallAvg]);

  const overallPrev = useMemo(() => {
    const prior = orgCell?.comparisons?.[compId];
    return typeof prior === "number" && prior > 0 ? r1(prior) : null;
  }, [orgCell, compId]);
  const overallDelta = overallPrev == null ? null : r1(overallAvg - overallPrev);
  const rowsByValueDesc = useMemo(
    () => [...rows].sort((left, right) => right.value - left.value || left.name.localeCompare(right.name)),
    [rows]
  );
  const rowsByDeltaDesc = useMemo(
    () =>
      rows
        .filter((row) => row.delta != null)
        .sort(
          (left, right) =>
            (right.delta as number) - (left.delta as number) || left.name.localeCompare(right.name)
        ) as Array<{ id: string; name: string; value: number; prev: number | null; delta: number }>,
    [rows]
  );

  const rrPct = current.responseRate != null ? `${Math.round(current.responseRate * 100)}%` : "—";
  const avgColor = readableText(sc(overallAvg)) === "#fff" ? sc(overallAvg) : "#152238";

  const scopeLabel = activeStatement ? "Statement view" : indexId ? `${idx.name} index average` : "All indexes average";
  const scopeDetail = activeStatement
    ? `“${activeStatement.text}”`
    : indexId
      ? `${idx.name} index average across all statements`
      : "All indexes averaged across all statements";

  if (!idx || indexes.length === 0 || locations.length === 0) {
    return <div className="p-8 text-sm text-text-secondary">No {primaryLabel.toLowerCase()} comparison data is available for this campaign yet.</div>;
  }

  // Keep the composite export header in sync with the active perspective/filters.
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title,
      filters: [indexId ? idx?.name : "All Indexes", current.labelLong || current.label].filter(
        (value): value is string => Boolean(value)
      ),
    });
  }

  return (
    <div
      className={chromeless ? (basinReportSurface ? "canvas basin-surface-1b" : "canvas") : "block"}
      style={chromeless ? { display: "block", background: basinReportSurface ? "#F4F4EF" : "#fff" } : EE_PERSPECTIVE_CANVAS_STYLE}
    >
      <EEReportStyles />
      {basinReportSurface ? <BasinSurfaceStyles /> : null}
      {executiveRail}

      <main
        className="flex flex-col gap-5"
        style={chromeless ? { background: basinReportSurface ? "#F4F4EF" : "#fff", overflowAnchor: "none" } : EE_PERSPECTIVE_MAIN_STYLE}
      >
        <div style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }} className="flex flex-col gap-5">

          {/* Hero */}
          {chromeless ? (
            // Design rule: comparison/segment-breakdown pages don't show
            // Responses/Response Rate/Company Avg up top — those roll up
            // multiple entities at once and read as a misleading single
            // number; only single-unit report pages (e.g. Basin Report) get
            // that header KPI treatment. hasComparison's Change YoY is a
            // genuine comparison stat, not a per-unit rollup, so it stays.
            hasComparison ? (
              <HeaderKpiPortal
                portalId={headerPortalId}
                surfaceTreatment={basinReportSurface ? "1b" : undefined}
                items={[
                  { label: "Change YoY", value: overallDelta == null ? "—" : f1(overallDelta), color: overallDelta == null ? "#6E7E96" : overallDelta >= 0 ? "#9CB2A8" : "#C8B9B6" },
                ]}
              />
            ) : null
          ) : (
          <div className="rounded-2xl p-5" style={{ border: "1px solid #8798AA", background: "linear-gradient(135deg,#fff 0%,#F1F4F7 55%,rgba(238,243,248,.5) 100%)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="mt-1 font-extrabold" style={{ fontSize: 27, letterSpacing: "-0.02em", color: "#152238" }}>{title}</h2>
                <p className="mt-0.5 font-semibold" style={{ fontSize: 14, color: "#3B4B63" }}>{current.labelLong}{comparedToText} · {scopeLabel}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                {([
                  ["Company Avg",   overallAvg.toFixed(1), avgColor],
                  ...(hasComparison ? [["Change YoY", overallDelta == null ? "—" : f1(overallDelta), overallDelta == null ? "#6E7E96" : overallDelta >= 0 ? "#9CB2A8" : "#C8B9B6"]] as [string, string, string][] : []),
                  ["Response Rate", rrPct,                 "#152238"],
                ] as [string, string, string][]).map(([label, value, color]) => (
                  <div key={label} className="flex min-h-[76px] min-w-[104px] flex-col items-center justify-center gap-1 rounded-2xl px-4 py-2" style={{ border: "1px solid #8798AA", background: "rgba(255,255,255,.85)" }}>
                    <div className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "#6E7E96" }}>{label}</div>
                    <div className="font-extrabold" style={{ fontSize: 25, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* DESIGN RULE: space between stacked report sections (Index
              Comparison / Statement Heat Map / Point Difference) is doubled
              for the redesign — matches the same rule applied to Basin
              Report's Index Scores/Index Comparison/Statement Results
              stack. Classic (non-chromeless) layout keeps the tighter gap. */}
          <div className={chromeless ? "flex flex-col gap-8" : "flex flex-col gap-4"}>
            {fieldLayout ? (
              (() => {
                const comparisonRow = (
              <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, width: 168, flexShrink: 0, paddingTop: 16, paddingBottom: 16 }}>
                  {railTabs.map((index, indexIndex) => {
                    const active = indexId === index.id;
                    const isSummary = railHasAllIndexes && index.id === "";
                    return (
                      <button
                        key={index.id}
                        type="button"
                        onClick={() => setIndexId(index.id)}
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: "0 12px",
                          borderTopLeftRadius: 12,
                          borderBottomLeftRadius: 12,
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                          cursor: "pointer",
                          fontSize: 13,
                          lineHeight: 1.2,
                          transition: "all .16s",
                          position: "relative",
                          marginBottom: indexIndex === railTabs.length - 1 ? 0 : isSummary ? 7 : -1,
                          ...(isSummary
                            ? { letterSpacing: ".1em", textTransform: "uppercase", fontSize: 11.5 }
                            : null),
                          ...(active
                            ? {
                                background: "#fff",
                                color: "#1E2329",
                                fontWeight: 800,
                                border: "1px solid #8798AA",
                                borderRight: "none",
                                marginRight: -1,
                                zIndex: 2,
                                boxShadow: "-1px 0 3px rgba(15,23,42,.05)",
                              }
                            : {
                                background: "#EEF2F6",
                                color: "#5A6B82",
                                fontWeight: 700,
                                border: "1px solid #D4DAD6",
                                zIndex: 1,
                              }),
                        }}
                      >
                        {index.name}
                      </button>
                    );
                  })}
                </div>
                <RegisteredVisualExportFrame order={10} label="Download chart" filename={exportFile("current-chart")} style={{ flex: 1, minWidth: 0 }}>
                <div className="card relative" style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-head flex items-center justify-between gap-4">
                    <h3 className="card-title">Current Campaign{indexId && idx ? ` · ${idx.name}` : " · All Indexes"}</h3>
                  </div>
                  <div className="card-body">
                    <BrandComparisonChart rows={rowsByValueDesc.map((row) => ({ id: row.id, name: row.name, value: row.value, org: overallAvg, delta: r1(row.value - overallAvg) }))} axis={barAxis} scoreColor={sc} uniform showOrgLine={false} benchmarkLabel={benchmarkLabel} />
                  </div>
                </div>
                </RegisteredVisualExportFrame>
              </div>
                );
                return chromeless ? (
                  basinReportSurface ? (
                    <SectionWithVerticalLabel label="Index Comparison">{comparisonRow}</SectionWithVerticalLabel>
                  ) : (
                    <>
                      <p className="slabel" style={{ marginBottom: 8 }}>Index Comparison</p>
                      {comparisonRow}
                    </>
                  )
                ) : (
                  comparisonRow
                );
              })()
            ) : (
              <RegisteredVisualExportFrame order={10} label="Download chart" filename={exportFile("current-chart")}>
              <div className="card relative">
                <div className="card-head flex items-center justify-between gap-4">
                  <h3 className="card-title">Current Campaign</h3>
                </div>
                <div className="card-body">
                  <BrandComparisonChart rows={rowsByValueDesc.map((row) => ({ id: row.id, name: row.name, value: row.value, org: overallAvg, delta: r1(row.value - overallAvg) }))} axis={barAxis} scoreColor={sc} showOrgLine={false} benchmarkLabel={benchmarkLabel} />
                </div>
              </div>
              </RegisteredVisualExportFrame>
            )}

            {fieldLayout && indexId && idx ? (
              (() => {
                const heatmapPanel = (
              <RegisteredVisualExportFrame order={20} label="Download heat map" filename={exportFile("statement-heatmap")}>
              <div style={{ border: basinReportSurface ? "1px solid rgba(135,152,170,0.7)" : "1px solid #8798AA", borderRadius: 16, background: "#fff", boxShadow: basinReportSurface ? "0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20)" : "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)", overflow: "hidden" }}>
                <div className="px-6 py-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
                  <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>{idx.name} Statement Heat Map</h3>
                  <p className="mt-1 text-[12px]" style={{ color: "#6E7E96" }}>Rows are {idx.name} statements; columns are each {primaryLabel.toLowerCase()} for {current.label}.</p>
                </div>
                <div className="px-6 py-5">
                  <ComparisonHeatmap
                    statements={idx.statements}
                    columns={rowsByValueDesc.map((row) => ({ id: row.id, name: row.name }))}
                    getValue={(statementId, columnId) => idx.statements.find((s) => s.id === statementId)?.byLocation[columnId]?.current ?? null}
                    getColumnAverage={(columnId) => idx.score?.byGroup?.[columnId]?.current ?? null}
                    getRowAverage={(statementId) => idx.statements.find((s) => s.id === statementId)?.org?.current ?? null}
                    grandAverage={idx.score?.org?.current ?? null}
                    scoreColor={sc}
                    columnHeader={`${idx.name} Statement`}
                  />
                </div>
              </div>
              </RegisteredVisualExportFrame>
                );
                return chromeless ? (
                  basinReportSurface ? (
                    <SectionWithVerticalLabel label="Statement Heat Map">{heatmapPanel}</SectionWithVerticalLabel>
                  ) : (
                    <>
                      <p className="slabel" style={{ marginBottom: 8 }}>Statement Heat Map</p>
                      {heatmapPanel}
                    </>
                  )
                ) : (
                  heatmapPanel
                );
              })()
            ) : null}

            {hasComparison ? (
              (() => {
                const pointDiffPanel = (
            <RegisteredVisualExportFrame order={30} label="Download chart" filename={exportFile("point-difference")}>
            <div style={{ border: basinReportSurface ? "1px solid rgba(135,152,170,0.7)" : "1px solid #8798AA", borderRadius: 16, background: "#fff", boxShadow: basinReportSurface ? "0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20)" : "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)", overflow: "hidden" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
                <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>Point Difference (YoY)</h3>
                <p className="mt-1 text-[12px]" style={{ color: "#6E7E96" }}>Change in points by {primaryLabel.toLowerCase()}{versusText} · gains in green, declines in red.</p>
              </div>
              <div className="px-6 py-5">
                <DeptDeltaChart rows={rowsByDeltaDesc.map(r => ({ name: r.name, delta: r.delta }))} axis={deltaAxis} />
              </div>
            </div>
            </RegisteredVisualExportFrame>
                );
                return chromeless ? (
                  basinReportSurface ? (
                    <SectionWithVerticalLabel label="Point Difference">{pointDiffPanel}</SectionWithVerticalLabel>
                  ) : (
                    <>
                      <p className="slabel" style={{ marginBottom: 8 }}>Point Difference</p>
                      {pointDiffPanel}
                    </>
                  )
                ) : (
                  pointDiffPanel
                );
              })()
            ) : null}
          </div>

        </div>
      </main>

      {/* Right rail */}
      <aside className="hidden xl:flex xl:flex-col xl:gap-4 xl:p-6" style={EE_GUIDANCE_RAIL_STYLE}>
        <EEContextRail scale={scale} howToRead={hasComparison ? `Each row is a ${primaryLabel.toLowerCase()} for the selected index or statement. Dashed line marks company average, and Point Difference shows movement vs compared campaign.` : `Each row is a ${primaryLabel.toLowerCase()} for the selected index or statement. Dashed line marks company average.`} />
        {dashboardInstanceId ? (
          <GuidancePinRail
            dashboardInstanceId={dashboardInstanceId}
            perspectiveId="ee-location-comparison"
            campaignLabel={current.label}
            filterKey={`${indexId || "all-indexes"}|${compId || "default-comp"}|${statementId || ALL}`}
            canEdit={canEditGuidance}
          />
        ) : null}
      </aside>

    </div>
  );
}

