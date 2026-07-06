"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { EEReportStyles, BasinSurfaceStyles, SectionWithVerticalLabel, HeaderKpiPortal, dwsScoreColor, makeGradientColor } from "./ee-report-kit";
import { EE_GUIDANCE_RAIL_STYLE, EE_PERSPECTIVE_CANVAS_STYLE, EE_PERSPECTIVE_MAIN_STYLE } from "./ee-executive-rail";
import { clampDeltaVisual, computeDeltaAxis, defaultComparisonId } from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";
import { GuidancePinRail } from "@/components/dashboard/guidance-pin-rail";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";
// ─── Types ────────────────────────────────────────────────────────────────────

interface Statement { text: string; current: number; comparisons: Record<string, number> }
interface Index { id: string; name: string; responses: number; statements: Statement[] }
interface Comparison { id: string; label: string; labelLong: string }
interface Data {
  client: { name: string; tagline?: string; logoUrl?: string };
  current: { label: string; labelLong: string; responseRate?: number };
  comparisons: Comparison[];
  scale: { min: number; mid: number; max: number };
  display?: { barAxis?: { min: number; max: number; ticks?: number[] }; deltaAxis?: { min: number; max: number; ticks?: number[] } };
  indexes: Index[];
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DATA: Data = {
  client: { name: "Top Flight", tagline: "100TH ANNIVERSARY" },
  current: { label: "Oct 2025", labelLong: "October 2025", responseRate: 0.71 },
  comparisons: [
    { id: "jul", label: "Jul-24", labelLong: "JUL 2024" },
    { id: "feb", label: "Feb-25", labelLong: "FEB 2025" },
  ],
  scale: { min: 60, mid: 72.5, max: 85 },
  indexes: [
    {
      id: "culture", name: "Culture", responses: 1284,
      statements: [
        { text: "Top Flight delivers on its promises to its customers",                       current: 77.4, comparisons: { jul: 68.4, feb: 73.0 } },
        { text: "Leaders at Top Flight demonstrate professional integrity",                   current: 71.3, comparisons: { jul: 69.9, feb: 70.5 } },
        { text: "My department receives good cooperation and support from other departments", current: 67.4, comparisons: { jul: 63.6, feb: 65.1 } },
        { text: "Top Flight delivers on its promises to its employees",                       current: 66.6, comparisons: { jul: 64.6, feb: 65.8 } },
        { text: "Top Flight employees work well together",                                    current: 65.7, comparisons: { jul: 62.6, feb: 64.0 } },
        { text: "Top Flight encourages open and honest communication",                        current: 65.7, comparisons: { jul: 65.0, feb: 65.2 } },
        { text: "People at Top Flight are allowed to challenge processes and share ideas",    current: 64.8, comparisons: { jul: 58.2, feb: 61.0 } },
        { text: "People at Top Flight treat each other with respect",                         current: 62.7, comparisons: { jul: 64.6, feb: 63.5 } },
        { text: "People at Top Flight take responsibility for their actions and results",     current: 58.8, comparisons: { jul: 62.2, feb: 60.1 } },
      ],
    },
    {
      id: "engagement", name: "Engagement", responses: 1284,
      statements: [
        { text: "I am willing to put in extra effort to help Top Flight succeed", current: 80.2, comparisons: { jul: 79.0, feb: 79.6 } },
        { text: "I am proud to work at Top Flight",                               current: 78.5, comparisons: { jul: 74.0, feb: 76.0 } },
        { text: "I would recommend Top Flight as a great place to work",          current: 72.0, comparisons: { jul: 70.5, feb: 71.2 } },
        { text: "My work gives me a sense of personal accomplishment",            current: 70.8, comparisons: { jul: 68.0, feb: 69.5 } },
        { text: "I feel motivated to do more than what is required of me",        current: 66.7, comparisons: { jul: 63.2, feb: 64.9 } },
        { text: "I feel energized by the work I do each day",                     current: 64.3, comparisons: { jul: 66.0, feb: 65.0 } },
        { text: "Top Flight inspires me to do my best work",                      current: 61.9, comparisons: { jul: 60.0, feb: 60.8 } },
        { text: "I rarely think about looking for a job at another company",      current: 57.4, comparisons: { jul: 61.0, feb: 59.0 } },
      ],
    },
    {
      id: "intent", name: "Intent to Stay", responses: 1271,
      statements: [
        { text: "I expect to be working at Top Flight two years from now", current: 74.6, comparisons: { jul: 71.0, feb: 72.8 } },
        { text: "My future at Top Flight looks bright",                    current: 69.3, comparisons: { jul: 64.0, feb: 66.6 } },
        { text: "Top Flight gives me good reasons to stay",                current: 66.1, comparisons: { jul: 67.5, feb: 66.9 } },
        { text: "I see a clear path to grow my career here",               current: 60.2, comparisons: { jul: 58.5, feb: 59.0 } },
        { text: "I rarely think about leaving Top Flight",                 current: 58.9, comparisons: { jul: 62.0, feb: 60.4 } },
        { text: "I would turn down a similar job offered elsewhere",       current: 55.7, comparisons: { jul: 57.2, feb: 56.5 } },
      ],
    },
    {
      id: "manager", name: "Manager", responses: 1259,
      statements: [
        { text: "My manager treats me with respect",                  current: 82.1, comparisons: { jul: 80.0, feb: 81.2 } },
        { text: "I trust my manager",                                 current: 76.4, comparisons: { jul: 73.5, feb: 75.0 } },
        { text: "My manager cares about me as a person",              current: 75.0, comparisons: { jul: 72.0, feb: 73.6 } },
        { text: "My manager communicates clearly",                    current: 70.2, comparisons: { jul: 71.8, feb: 70.9 } },
        { text: "My manager removes obstacles so I can do my work",   current: 68.5, comparisons: { jul: 66.2, feb: 67.3 } },
        { text: "My manager recognizes my contributions",             current: 67.9, comparisons: { jul: 64.5, feb: 66.0 } },
        { text: "My manager gives me useful feedback",                current: 65.8, comparisons: { jul: 61.0, feb: 63.4 } },
        { text: "My manager helps me grow and develop",               current: 63.2, comparisons: { jul: 64.8, feb: 64.0 } },
      ],
    },
  ],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const r1    = (n: number) => Math.round(n * 10) / 10;
const mean  = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
const f1    = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1);
function tensWithin(min: number, max: number) {
  const out: number[] = [];
  for (let v = Math.ceil(min / 10) * 10; v <= max; v += 10) out.push(v);
  return out;
}

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
function FavChart({ rows, avg, axis, color }: {
  rows: { t: string; v: number }[];
  avg: number;
  axis: { min: number; max: number; ticks: number[] };
  color: (v: number) => string;
}) {
  const ROW_HEIGHT = 34;
  const pct = (v: number) => `${((clamp(v, axis.min, axis.max) - axis.min) / (axis.max - axis.min)) * 100}%`;
  return (
    <div>
      <div style={{ position: "relative" }}>
        {/* gridlines */}
        <div style={{ position: "absolute", left: "50%", right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 1 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: pct(t), borderLeft: "1px dashed #D3DDE7" }} />)}
        </div>
        {/* rows */}
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(260px, 50%) minmax(0, 1fr)", minHeight: ROW_HEIGHT, alignItems: "center", position: "relative" }}>
          <div title={r.t} style={{ padding: "3px 16px 3px 0", alignSelf: "center", fontSize: 12.5, lineHeight: 1.18, fontWeight: 500, color: "#3B4B63", zIndex: 2 }}>{r.t}</div>
          <div style={{ position: "relative", height: 24, alignSelf: "center", zIndex: 2 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(r.v), background: color(r.v), borderRadius: 3, transition: "width .55s cubic-bezier(.34,1.1,.64,1)" }}>
              <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(21,34,56,.82)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 6px" }}>{r.v.toFixed(1)}</div>
            </div>
          </div>
          </div>
        ))}
        {/* avg line */}
        <div style={{ position: "absolute", left: "50%", right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 3 }}>
          <div style={{ position: "absolute", left: pct(avg), top: 0, bottom: 0, borderLeft: "2px dashed #8798AA" }}>
            <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", background: "#E8ECE9", border: "1px solid #D4DAD6", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#3B4B63", whiteSpace: "nowrap" }}>Index avg {avg.toFixed(1)}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 50%) minmax(0, 1fr)", marginTop: 4 }}>
        <div />
        <div style={{ position: "relative", height: 20 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", left: pct(t), transform: "translateX(-50%)", fontSize: 11, color: "#6E7E96" }}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

function DeltaChart({ rows, axis }: { rows: { t: string; delta: number }[]; axis: { min: number; max: number; ticks: number[] } }) {
  const ROW_HEIGHT = 34;
  const span = axis.max - axis.min;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const xp = (v: number) => `${((clamp(v, axis.min, axis.max) - axis.min) / span) * 100}%`;
  const z0 = ((0 - axis.min) / span) * 100;
  const sorted = [...rows].sort((a, b) => b.delta - a.delta);
  return (
    <div>
      <div style={{ position: "relative" }}>
        {/* gridlines */}
        <div style={{ position: "absolute", left: "50%", right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 1 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: xp(t), borderLeft: t === 0 ? "2px solid #8798AA" : "1px dashed #D3DDE7" }} />)}
        </div>
        {sorted.map((r, i) => {
          const s = dStyle(r.delta);
          const pos = r.delta >= 0;
          const visualDelta = clampDeltaVisual(r.delta, axis);
          const w = Math.abs((visualDelta / span) * 100);
          const rawLeft = pos ? z0 : z0 - w;
          const left = Math.max(0, Math.min(100 - w, rawLeft));
          const width = Math.min(w, 100 - left);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(260px, 50%) minmax(0, 1fr)", minHeight: ROW_HEIGHT, alignItems: "center", position: "relative" }}>
            <div title={r.t} style={{ padding: "3px 16px 3px 0", alignSelf: "center", fontSize: 12.5, lineHeight: 1.18, fontWeight: 500, color: "#3B4B63", zIndex: 2 }}>{r.t}</div>
            <div style={{ position: "relative", height: 24, alignSelf: "center", zIndex: 2, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: s.bg, borderRadius: 3, transition: "left .55s cubic-bezier(.34,1.1,.64,1), width .55s cubic-bezier(.34,1.1,.64,1)" }} />
              <div style={{ position: "absolute", top: "50%", transform: pos ? "translateY(-50%)" : "translate(-100%, -50%)", left: pos ? `calc(${left + width}% + 6px)` : `calc(${left}% - 6px)`, background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>{f1(r.delta)}</div>
            </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 50%) minmax(0, 1fr)", marginTop: 4 }}>
        <div />
        <div style={{ position: "relative", height: 20 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", left: xp(t), transform: "translateX(-50%)", fontSize: 11, color: "#6E7E96" }}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── Perspective ──────────────────────────────────────────────────────────────

export function EECampaignResults({
  data,
  dashboardInstanceId,
  canEditGuidance = false,
  executiveRail,
  indexId: controlledIndexId,
  onIndexId,
  compId: controlledCompId,
  onCompId,
  chromeless = false,
  headerPortalId,
  basinReportSurface = false,
}: {
  data: Data;
  dashboardInstanceId?: string;
  canEditGuidance?: boolean;
  executiveRail?: React.ReactNode;
  indexId?: string;
  onIndexId?: (value: string) => void;
  compId?: string;
  onCompId?: (value: string) => void;
  chromeless?: boolean;
  headerPortalId?: string;
  /** Basin group surface treatment "1b" (DWS Field redesign pilot only):
   * shared canvas tint, soft blue borders/shadows, and vertical section
   * labels — see the matching prop on `EELocationComparison`. Every other
   * caller leaves this unset and keeps the hard-edged default look. */
  basinReportSurface?: boolean;
}) {
  const { client, current, comparisons, scale, indexes } = data;
  const sc = makeGradientColor(scale.min, scale.max);
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const [localIndexId, setLocalIndexId] = useState("");
  const [localCompId, setLocalCompId] = useState(() => defaultComparisonId(comparisons));
  const [openIndexId, setOpenIndexId] = useState(chromeless ? "" : indexes[0]?.id ?? "");
  const indexId = controlledIndexId ?? localIndexId;
  const setIndexId = onIndexId ?? setLocalIndexId;
  const compId = controlledCompId ?? localCompId;
  const setCompId = onCompId ?? setLocalCompId;

  const selectedIndexes = useMemo(() => {
    if (!indexId) return indexes;
    const selected = indexes.find((item) => item.id === indexId);
    return selected ? [selected] : indexes;
  }, [indexes, indexId]);
  const idx  = selectedIndexes[0] ?? indexes[0];
  const comp = comparisons.find(c => c.id === compId) ?? comparisons[0];
  const hasComparison = comparisons.length > 0;
  const versusText = comp ? ` vs ${comp.label}` : "";

  const barAxis = useMemo(() => {
    const a = data.display?.barAxis ?? { min: scale.min - 4, max: scale.max - 5 };
    return { min: a.min, max: a.max, ticks: a.ticks ?? tensWithin(a.min, a.max) };
  }, [data.display?.barAxis, scale.min, scale.max]);

  const rows = useMemo(
    () =>
      selectedIndexes.flatMap((index) =>
        (index.statements ?? []).map((statement, statementIndex) => {
          const prev = Object.prototype.hasOwnProperty.call(statement.comparisons, compId)
            ? statement.comparisons[compId]
            : null;
          return {
            id: `${index.id}:${statementIndex}`,
            t: statement.text,
            v: statement.current,
            prev,
            delta: prev == null ? null : r1(statement.current - prev),
          };
        })
      ),
    [selectedIndexes, compId]
  );

  const validDeltaRows = useMemo(() => rows.filter((row) => row.delta != null), [rows]);

  const curAvg  = useMemo(() => r1(mean(rows.map(r => r.v))),    [rows]);
  const prevAvg = useMemo(() => validDeltaRows.length > 0 ? r1(mean(validDeltaRows.map(r => r.prev as number))) : null, [validDeltaRows]);
  const yoy     = prevAvg == null ? null : r1(curAvg - prevAvg);

  const rrPct = current.responseRate != null ? `${Math.round(current.responseRate * 100)}%` : "—";  const avgColor = sc(curAvg);

  const btn = (active: boolean) => ({
    style: active
      ? { background: "#2B2B2B", color: "#fff",    border: "1px solid #2B2B2B" }
      : { background: "#fff",    color: "#3B4B63", border: "1px solid #D4DAD6" },
  });

  if (!idx || indexes.length === 0) {
    return <div className="p-8 text-sm text-text-secondary">No detailed results are available for this dataset yet.</div>;
  }

  // Keep the composite export header in sync with the active perspective/filters.
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Detailed Results",
      filters: [idx?.name, current.labelLong || current.label].filter(
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

      {!executiveRail ? (
        <aside
          className="flex flex-col gap-4 p-6"
          style={{
            position: "fixed",
            top: "calc(var(--app-top-banner-height,78px) + 66px)",
            bottom: 0,
            left: 0,
            width: 268,
            overflow: "auto",
            background: "#E8ECE9",
            borderRight: "1px solid #D4DAD6",
          }}
        >

        {/* Client card */}
        <div className="rounded-[18px] bg-white p-4 text-center" style={{ border: "1px solid #8798AA", boxShadow: "0 2px 8px rgba(15,23,42,.07)" }}>
          <img src={client.logoUrl ?? "/deep-well-services-logo.png"} alt={`${client.name} logo`} className="mx-auto h-auto w-[180px]" />
          <div className="mt-3 font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: "0.1em", color: "#152238" }}>CAMPAIGN RESULTS</div>
          <div className="mt-0.5 italic" style={{ fontSize: 10.5, color: "#6E7E96" }}>{comp ? `(compared to ${comp.labelLong})` : ""}</div>
        </div>

        {hasComparison ? (
        <RailSection title="Campaign Comparison" defaultOpen>
          <div className="flex flex-col gap-2">
            {[...comparisons].reverse().map(c => (
              <button key={c.id} type="button" onClick={() => setCompId(c.id)} className="w-full rounded-[11px] px-3 py-2.5 text-sm font-semibold transition-colors" {...btn(compId === c.id)}>{c.label}</button>
            ))}
          </div>
        </RailSection>
        ) : null}

        <RailSection title="Index Selection">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIndexId("")}
              className="w-full rounded-[11px] px-3 py-2.5 text-center text-sm font-semibold transition-colors"
              {...btn(!indexId)}
            >
              All indexes
            </button>
            {indexes.map(ix => (
              <button key={ix.id} type="button" onClick={() => setIndexId(ix.id)} className="w-full rounded-[11px] px-3 py-2.5 text-center text-sm font-semibold transition-colors" {...btn(indexId === ix.id)}>{ix.name}</button>
            ))}
          </div>
        </RailSection>
      </aside>
      ) : null}

      <main
        className="flex flex-col gap-5"
        style={chromeless ? { background: basinReportSurface ? "#F4F4EF" : "#fff", overflowAnchor: "none" } : EE_PERSPECTIVE_MAIN_STYLE}
      >
        <div style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }} className="flex flex-col gap-5">

          {/* Hero */}
          {chromeless ? (
            <HeaderKpiPortal
              portalId={headerPortalId}
              surfaceTreatment={basinReportSurface ? "1b" : undefined}
              items={[
                { label: "Index Average", value: curAvg.toFixed(1), color: avgColor },
                ...(hasComparison
                  ? [{ label: "Change YoY", value: yoy == null ? "—" : f1(yoy), color: yoy == null ? "#6E7E96" : yoy >= 0 ? "#9CB2A8" : "#C8B9B6" }]
                  : []),
                { label: "Response Rate", value: rrPct },
              ]}
            />
          ) : (
          <div className="rounded-2xl p-5" style={{ border: "1px solid #8798AA", background: "linear-gradient(135deg,#fff 0%,#F1F4F7 55%,rgba(238,243,248,.5) 100%)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: "0.2em", color: "#6E7E96" }}>Detailed Results</p>
                <h2 className="mt-1 font-extrabold" style={{ fontSize: 27, letterSpacing: "-0.02em", color: "#152238" }}>Detailed Results</h2>
                <p className="mt-0.5 font-semibold" style={{ fontSize: 14, color: "#3B4B63" }}>{current.labelLong}{comp ? ` · compared to ${comp.label}` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                {([
                  ["Index Average", curAvg.toFixed(1),  avgColor],
                  ...(hasComparison ? [["Change YoY", yoy == null ? "—" : f1(yoy), yoy == null ? "#6E7E96" : yoy >= 0 ? "#9CB2A8" : "#C8B9B6"]] as [string, string, string][] : []),
                  ["Response Rate", rrPct,               "#152238"],
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

          {(() => {
            const statementResultsPanel = (
          <RegisteredVisualExportFrame order={10} label="Download table" filename={buildDashboardExportFilename({ client: "dws", perspective: "detailed-results", campaign: current.label })}>
          <div style={{ border: basinReportSurface ? "1px solid rgba(135,152,170,0.7)" : "1px solid #8798AA", borderRadius: 16, background: "#fff", boxShadow: basinReportSurface ? "0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20)" : "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)", overflow: "hidden" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
              <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>Statement Results</h3>
              <p className="mt-1 text-[12px]" style={{ color: "#6E7E96" }}>Expand one index at a time to review statement-level scores for {current.label}{comp ? ` and change${versusText}` : ""}.</p>
            </div>
            <div className="px-6 py-5">
              <div style={{ overflow: "hidden", border: "1px solid #8798AA", borderRadius: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ background: "#E2E8EF", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", padding: "11px 14px", borderBottom: "1px solid #8798AA" }}>Expand an index for statements</th>
                      <th style={{ background: "#E2E8EF", textAlign: "center", width: 84, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", padding: "11px 8px", borderBottom: "1px solid #8798AA", borderRight: hasComparison ? "3px solid #8798AA" : undefined }}>{current.label}</th>
                      {hasComparison ? <th style={{ background: "#E2E8EF", textAlign: "center", width: 84, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", padding: "11px 8px", borderBottom: "1px solid #8798AA", borderLeft: "3px solid #8798AA" }}>Delta</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {indexes.map((index) => {
                      const open = openIndexId === index.id;
                      const statementRows = index.statements.map((statement) => {
                        const candidate = Object.prototype.hasOwnProperty.call(statement.comparisons, compId) ? statement.comparisons[compId] : null;
                        const prev = candidate != null && candidate > 0 ? candidate : null;
                        return {
                          id: statement.text,
                          text: statement.text,
                          current: statement.current,
                          delta: prev == null ? null : r1(statement.current - prev),
                        };
                      });
                      const indexCurrent = r1(mean(statementRows.map((row) => row.current)));
                      const deltaValues = statementRows.map((row) => row.delta).filter((value): value is number => value != null);
                      const indexDelta = deltaValues.length > 0 ? r1(mean(deltaValues)) : null;
                      const currentColor = sc(indexCurrent);
                      return (
                        <>
                          <tr onClick={() => setOpenIndexId(open ? "" : index.id)} style={{ cursor: "pointer", background: "#F1F4F7", borderTop: "1px solid #D3DDE7" }}>
                            <td style={{ padding: "9px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 14, height: 14, color: "#6E7E96", transform: open ? "rotate(90deg)" : undefined, transition: "transform .2s" }}><ChevronRight className="h-4 w-4" /></span><span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#152238" }}>{index.name}</span></div></td>
                            <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, fontSize: 12.5, borderRight: hasComparison ? "3px solid #8798AA" : undefined, background: currentColor, color: readableText(currentColor) }}>{indexCurrent.toFixed(1)}</td>
                            {hasComparison ? <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, fontSize: 12.5, borderLeft: "3px solid #8798AA", ...(indexDelta == null ? { color: "#6E7E96" } : { background: dStyle(indexDelta).bg, color: dStyle(indexDelta).fg }) }}>{indexDelta == null ? "—" : f1(indexDelta)}</td> : null}
                          </tr>
                          {open && statementRows.map((row) => {
                            const color = sc(row.current);
                            return (
                              <tr key={`${index.id}-${row.id}`} style={{ borderTop: "1px solid #D3DDE7" }}>
                                <td style={{ padding: "7px 14px 7px 30px", color: "#3B4B63", fontWeight: 500, lineHeight: 1.34, fontSize: 12.5 }}>{row.text}</td>
                                <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, fontSize: 12.5, borderRight: hasComparison ? "3px solid #8798AA" : undefined, background: color, color: readableText(color) }}>{row.current.toFixed(1)}</td>
                                {hasComparison ? <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, fontSize: 12.5, borderLeft: "3px solid #8798AA", ...(row.delta == null ? { color: "#6E7E96" } : { background: dStyle(row.delta).bg, color: dStyle(row.delta).fg }) }}>{row.delta == null ? "—" : f1(row.delta)}</td> : null}
                              </tr>
                            );
                          })}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </RegisteredVisualExportFrame>
            );
            return chromeless ? (
              basinReportSurface ? (
                <SectionWithVerticalLabel label="Index and Statement Results">{statementResultsPanel}</SectionWithVerticalLabel>
              ) : (
                <>
                  <p className="slabel" style={{ marginBottom: 8 }}>Index and Statement Results</p>
                  {statementResultsPanel}
                </>
              )
            ) : (
              statementResultsPanel
            );
          })()}

        </div>
      </main>

      <aside className="hidden xl:block" style={EE_GUIDANCE_RAIL_STYLE}>
        <div className="flex h-full flex-col gap-4 p-6">
          <EEContextRail scale={scale} howToRead={hasComparison ? "Detailed Results lets you expand one index at a time and review statement-level current scores with delta vs the selected comparison campaign." : "Detailed Results lets you expand one index at a time and review statement-level current scores."} />
          {dashboardInstanceId ? (
            <GuidancePinRail
              dashboardInstanceId={dashboardInstanceId}
              perspectiveId="ee-campaign-results"
              campaignLabel={current.label}
              filterKey={`${indexId || "all-indexes"}|${compId || comp?.id || "no-comparison"}`}
              canEdit={canEditGuidance}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

