"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";
import { GuidancePinRail } from "@/components/dashboard/guidance-pin-rail";
import { EE_GUIDANCE_RAIL_STYLE, EE_PERSPECTIVE_CANVAS_STYLE, EE_PERSPECTIVE_MAIN_STYLE } from "./ee-executive-rail";
import { clampDeltaVisual, computeDeltaAxis, defaultComparisonId } from "./ee-report-kit";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LocationCell { current: number; comparisons: Record<string, number> }
interface Statement { id: string; text: string; byLocation: Record<string, LocationCell> }
interface Index { id: string; name: string; statements: Statement[] }
interface Comparison { id: string; label: string; labelLong: string }
interface Location { id: string; name: string }
interface Data {
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

// dark vs light text over a band color, by luminance
function readableText(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C252A" : "#fff";
}

// ─── RailSection ──────────────────────────────────────────────────────────────

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
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
// Location rows preserve their dataset order (NOT sorted) so the left bar
// chart and the right delta chart line up location-for-location.

function DeptFavChart({ rows, avg, axis, color }: {
  rows: { name: string; value: number }[];
  avg: number;
  axis: { min: number; max: number; ticks: number[] };
  color: (v: number) => string;
}) {
  const ROW_HEIGHT = 34;
  const pct = (v: number) => `${((clamp(v, axis.min, axis.max) - axis.min) / (axis.max - axis.min)) * 100}%`;
  return (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "44%", right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 1 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: pct(t), borderLeft: "1px dashed #D3DDE7" }} />)}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 44%) minmax(0, 1fr)", minHeight: ROW_HEIGHT, alignItems: "center", position: "relative" }}>
          <div title={r.name} style={{ padding: "3px 12px 3px 0", alignSelf: "center", fontSize: 12.5, lineHeight: 1.18, fontWeight: 500, color: "#3B4B63", zIndex: 2 }}>{r.name}</div>
          <div style={{ position: "relative", height: 24, alignSelf: "center", zIndex: 2 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct(r.value), background: color(r.value), borderRadius: 3, transition: "width .55s cubic-bezier(.34,1.1,.64,1)" }}>
              <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "rgba(21,34,56,.82)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 6px" }}>{r.value.toFixed(1)}</div>
            </div>
          </div>
          </div>
        ))}
        <div style={{ position: "absolute", left: "44%", right: 0, top: 0, bottom: 0, pointerEvents: "none", zIndex: 3 }}>
          <div style={{ position: "absolute", left: pct(avg), top: 0, bottom: 0, borderLeft: "2px dashed #8798AA" }}>
            <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", background: "#E8ECE9", border: "1px solid #D4DAD6", borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#3B4B63", whiteSpace: "nowrap" }}>Dept avg {avg.toFixed(1)}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 44%) minmax(0, 1fr)", marginTop: 4 }}>
        <div />
        <div style={{ position: "relative", height: 20 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", left: pct(t), transform: "translateX(-50%)", fontSize: 11, color: "#6E7E96" }}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

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
          const visualDelta = clampDeltaVisual(r.delta, axis);
          const w = Math.abs((visualDelta / span) * 100);
          const rawLeft = pos ? z0 : z0 - w;
          const left = Math.max(0, Math.min(100 - w, rawLeft));
          const width = Math.min(w, 100 - left);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(150px, 44%) minmax(0, 1fr)", minHeight: ROW_HEIGHT, alignItems: "center", position: "relative" }}>
            <div title={r.name} style={{ padding: "3px 12px 3px 0", alignSelf: "center", fontSize: 12.5, lineHeight: 1.18, fontWeight: 500, color: "#3B4B63", zIndex: 2 }}>{r.name}</div>
            <div style={{ position: "relative", height: 24, alignSelf: "center", zIndex: 2, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 0, bottom: 0, background: s.bg, borderRadius: 3, transition: "left .55s cubic-bezier(.34,1.1,.64,1), width .55s cubic-bezier(.34,1.1,.64,1)" }} />
              <div style={{ position: "absolute", top: "50%", transform: pos ? "translateY(-50%)" : "translate(-100%, -50%)", left: pos ? `calc(${left + width}% + 6px)` : `calc(${left}% - 6px)`, background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>{f1(r.delta)}</div>
            </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 44%) minmax(0, 1fr)", marginTop: 4 }}>
        <div />
        <div style={{ position: "relative", height: 20 }}>
          {axis.ticks.map(t => <div key={t} style={{ position: "absolute", left: xp(t), transform: "translateX(-50%)", fontSize: 11, color: "#6E7E96" }}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── Perspective ──────────────────────────────────────────────────────────────

const ALL = "__ALL__";

export function EELocationComparison({
  data,
  dashboardInstanceId,
  canEditGuidance = false,
  executiveRail,
  indexId: controlledIndexId,
  onIndexId,
  compId: controlledCompId,
  onCompId,
  statementId: controlledStatementId,
  onStatementId,
}: {
  data: Data;
  dashboardInstanceId?: string;
  canEditGuidance?: boolean;
  executiveRail?: React.ReactNode;
  indexId?: string;
  onIndexId?: (value: string) => void;
  compId?: string;
  onCompId?: (value: string) => void;
  statementId?: string;
  onStatementId?: (value: string) => void;
}) {
  const { client, current, comparisons, scale, indexes, locations } = data;
  const sc = (v: number) => scoreScaleColor(v, scale.min, scale.mid, scale.max);

  const [localIndexId, setLocalIndexId] = useState(indexes[0]?.id ?? "");
  const [localCompId, setLocalCompId] = useState(() => defaultComparisonId(comparisons));
  const indexId = controlledIndexId ?? localIndexId;
  const setIndexId = onIndexId ?? setLocalIndexId;
  const compId = controlledCompId ?? localCompId;
  const setCompId = onCompId ?? setLocalCompId;
  const [localStatementId, setLocalStatementId] = useState(ALL);
  const statementId = controlledStatementId ?? localStatementId;
  const setStatementId = onStatementId ?? setLocalStatementId;

  const idx = indexes.find(i => i.id === indexId) ?? indexes[0];
  const comp = comparisons.find(c => c.id === compId) ?? comparisons[0];

  // changing index falls back to the index-average view
  useEffect(() => { setStatementId(ALL); }, [indexId]);

  const activeStatement = statementId === ALL ? null : idx.statements.find(s => s.id === statementId) ?? null;

  const barAxis = useMemo(() => {
    const a = data.display?.barAxis ?? { min: scale.min - 4, max: scale.max - 5 };
    return { min: a.min, max: a.max, ticks: a.ticks ?? tensWithin(a.min, a.max) };
  }, [data.display?.barAxis, scale.min, scale.max]);

  const rows = useMemo(() => locations.map(d => {
    let cur: number, prev: number;
    if (activeStatement) {
      const cell = activeStatement.byLocation[d.id];
      cur = cell.current;
      prev = cell.comparisons[compId] ?? 0;
    } else {
      const curs = idx.statements.map(s => s.byLocation[d.id].current);
      const prevs = idx.statements.map(s => s.byLocation[d.id].comparisons[compId] ?? 0);
      cur = r1(mean(curs));
      prev = r1(mean(prevs));
    }
    return { id: d.id, name: d.name, value: cur, prev, delta: r1(cur - prev) };
  }), [locations, idx, activeStatement, compId]);

  const deltaAxis = useMemo(() => {
    const fallback = data.display?.deltaAxis
      ? { ...data.display.deltaAxis, ticks: data.display.deltaAxis.ticks ?? [-10, 0, 10] }
      : { min: -10, max: 10, ticks: [-10, 0, 10] };
    return computeDeltaAxis(rows.map((row) => ({ delta: row.delta })), fallback);
  }, [data.display?.deltaAxis, rows]);

  const overallAvg = r1(mean(rows.map(r => r.value)));
  const overallPrev = r1(mean(rows.map(r => r.prev)));
  const overallDelta = r1(overallAvg - overallPrev);

  const rrPct = current.responseRate != null ? `${Math.round(current.responseRate * 100)}%` : "—";
  const avgColor = readableText(sc(overallAvg)) === "#fff" ? sc(overallAvg) : "#152238";

  const scopeLabel = activeStatement ? "Statement view" : `${idx.name} index average`;
  const scopeDetail = activeStatement ? `“${activeStatement.text}”` : `${idx.name} index average across all statements`;

  if (!idx || indexes.length === 0 || locations.length === 0) {
    return <div className="p-8 text-sm text-text-secondary">No brand comparison data is available for this campaign yet.</div>;
  }

  return (
    <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
      {executiveRail}

      <main className="flex flex-col gap-5" style={EE_PERSPECTIVE_MAIN_STYLE}>
        <div style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }} className="flex flex-col gap-5">

          {/* Hero */}
          <div className="rounded-2xl p-5" style={{ border: "1px solid #8798AA", background: "linear-gradient(135deg,#fff 0%,#F1F4F7 55%,rgba(238,243,248,.5) 100%)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="mt-1 font-extrabold" style={{ fontSize: 27, letterSpacing: "-0.02em", color: "#152238" }}>Brand Comparison</h2>
                <p className="mt-0.5 font-semibold" style={{ fontSize: 14, color: "#3B4B63" }}>{current.labelLong} · compared to {comp.label} · {scopeLabel}</p>
              </div>
              <div className="flex shrink-0 gap-3">
                {([
                  ["Company Avg",   overallAvg.toFixed(1), avgColor],
                  ["Change YoY",    f1(overallDelta),      overallDelta >= 0 ? "#9CB2A8" : "#C8B9B6"],
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

          {/* Chart pair */}
          <div className="grid gap-4 xl:grid-cols-2">
            <div style={{ border: "1px solid #8798AA", borderRadius: 16, boxShadow: "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)", overflow: "hidden" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
                <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>Current Campaign</h3>
                <p className="mt-1 text-[12px]" style={{ color: "#6E7E96" }}>Favorability by brand · {scopeDetail} · dashed line marks the company average.</p>
              </div>
              <div className="px-6 py-5">
                <DeptFavChart rows={rows.map(r => ({ name: r.name, value: r.value }))} avg={overallAvg} axis={barAxis} color={sc} />
              </div>
            </div>

            <div style={{ border: "1px solid #8798AA", borderRadius: 16, boxShadow: "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)", overflow: "hidden" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
                <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>Point Difference (YoY)</h3>
                <p className="mt-1 text-[12px]" style={{ color: "#6E7E96" }}>Change in points by brand vs {comp.label} · gains in green, declines in red.</p>
              </div>
              <div className="px-6 py-5">
                <DeptDeltaChart rows={rows.map(r => ({ name: r.name, delta: r.delta }))} axis={deltaAxis} />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Right rail */}
      <aside className="hidden xl:flex xl:flex-col xl:gap-4 xl:p-6" style={EE_GUIDANCE_RAIL_STYLE}>
        <GuidancePinRail
          dashboardInstanceId={dashboardInstanceId}
          perspectiveId="ee-location-comparison"
          campaignLabel={current.label}
          filterKey={indexId}
          canEdit={canEditGuidance}
          className="flex flex-col gap-4"
          style={{ position: "static", width: "auto", background: "transparent", border: "none", overflow: "visible" }}
        />
      </aside>

    </div>
  );
}
