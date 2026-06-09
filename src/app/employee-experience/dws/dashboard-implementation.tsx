"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Minus } from "lucide-react";
import { EECampaignResults } from "./ee-campaign-results";
import { EEDepartmentComparison } from "./ee-department-comparison";
import { EELocationComparison } from "./ee-location-comparison";
import { EEDepartmentReport } from "./ee-department-report";
import { EEHistoricalReport } from "./ee-historical-report";
import { EESupervisorReport } from "./ee-supervisor-report";
import { EEExecutiveRail, EE_GUIDANCE_RAIL_STYLE, EE_PERSPECTIVE_CANVAS_STYLE, EE_PERSPECTIVE_MAIN_STYLE } from "./ee-executive-rail";
import { buildEmployeeExperienceReportBundle } from "./ee-live-projections";
import { defaultComparisonId } from "./ee-report-kit";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { scoreScaleColor, scoreScaleTextColor } from "@/components/collaboration/score-color-scale";
import { mergeHiddenDimensionIds } from "@/lib/employee-experience/excluded-dimensions";
import { isKnownBrandSegment } from "@/lib/employee-experience/dws-dashboard";
import { DashboardCanvas, DashboardRibbon } from "@/components/dashboard/dashboard-shell";
import { GuidancePinRail } from "@/components/dashboard/guidance-pin-rail";
import { cn } from "@/lib/utils";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceRespondent,
} from "@/types/employee-experience";

// ─── Constants ────────────────────────────────────────────────────────────────

const EE = { min: 6, mid: 7.25, max: 8.5, minLabel: "60", maxLabel: "85" } as const;

const EE_PANEL =
  "overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[7px_9px_20px_rgba(15,23,42,0.09),2px_3px_6px_rgba(15,23,42,0.05)]";

function EEPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(EE_PANEL, className)}>{children}</div>;
}

function EEPanelHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-6 pb-3 pt-6", className)}>
      <h3 className="text-lg font-bold leading-none tracking-tight text-text-primary">{title}</h3>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

function EEPanelContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

const DIM_ORDER = ["Acquisition", "Culture", "Daily Work", "Intent", "Supervisor", "Engage", "Balance"];

function orderedDimensionNames(questions: EmployeeExperienceQuestionDefinition[]) {
  const present = Array.from(new Set(questions.map((question) => question.dimension)));
  const preferred = DIM_ORDER.filter((dimension) => present.includes(dimension));
  const remaining = present
    .filter((dimension) => !DIM_ORDER.includes(dimension))
    .sort((left, right) => left.localeCompare(right));

  return [...preferred, ...remaining];
}

const GROUPS = [
  {
    id: "executive" as const,
    label: "Executive",
    perspectives: [
      { id: "exec-overview" as const, label: "Campaign Overview" },
      { id: "exec-location" as const, label: "Brand Breakdown" },
      { id: "ee-campaign-results" as const, label: "Campaign Results" },
      { id: "ee-department-comparison" as const, label: "Department Comparison" },
      { id: "ee-location-comparison" as const, label: "Brand Comparison" },
      { id: "ee-historical-report" as const, label: "Detailed History" },
    ],
  },
  {
    id: "hr" as const,
    label: "HR",
    perspectives: [
      { id: "hr-rankings" as const, label: "Department Rankings" },
      { id: "hr-index-dive" as const, label: "Index Deep Dive" },
      { id: "hr-open-text" as const, label: "Open Text" },
    ],
  },
  {
    id: "department" as const,
    label: "Department",
    perspectives: [
      { id: "ee-department-report" as const, label: "Department Report" },
      { id: "hr-supervisor" as const, label: "Supervisor Reports" },
    ],
  },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];
type PerspectiveId =
  | "exec-overview" | "exec-location" | "ee-campaign-results" | "ee-department-comparison" | "ee-location-comparison"
  | "hr-rankings" | "hr-index-dive" | "hr-supervisor" | "hr-open-text"
  | "dept-scorecard" | "ee-department-report" | "ee-historical-report";

const EXECUTIVE_PERSPECTIVES = new Set<PerspectiveId>([
  "exec-overview",
  "exec-location",
  "ee-campaign-results",
  "ee-department-comparison",
  "ee-location-comparison",
  "ee-historical-report",
]);

const EXECUTIVE_PERSPECTIVE_TITLES: Record<PerspectiveId, string> = {
  "exec-overview": "Campaign Overview",
  "exec-location": "Brand Breakdown",
  "ee-campaign-results": "Campaign Results",
  "ee-department-comparison": "Department Comparison",
  "ee-location-comparison": "Brand Comparison",
  "ee-historical-report": "Detailed History",
  "hr-rankings": "Department Rankings",
  "hr-index-dive": "Index Deep Dive",
  "hr-supervisor": "Supervisor Reports",
  "hr-open-text": "Open Text",
  "dept-scorecard": "Department Scorecard",
  "ee-department-report": "Department Report",
};

const OPEN_TEXT_FIELDS = [
  { id: "strengths" as const, label: "Greatest Strengths", dimensionId: undefined },
  { id: "improvement" as const, label: "Desired Changes", dimensionId: undefined },
  { id: "supervisor" as const, label: "Supervisor Feedback", dimensionId: undefined },
  { id: "acquisition" as const, label: "Acquisition Comments", dimensionId: "acquisition" },
];
type OpenTextField = "strengths" | "improvement" | "supervisor" | "acquisition";

// ─── Utilities ────────────────────────────────────────────────────────────────

function r1(v: number) { return Math.round(v * 10) / 10; }

function normalizeDimensionId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function avg(vals: number[]) {
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function groupScore(respondents: EmployeeExperienceRespondent[], itemIds: number[]): number {
  const scores = respondents
    .map((r) => {
      const vs = itemIds.map((id) => r.scores[id]).filter((v): v is number => v !== null);
      return vs.length > 0 ? avg(vs) : null;
    })
    .filter((v): v is number => v !== null);
  return scores.length > 0 ? r1(avg(scores)) : 0;
}

function itemScore(respondents: EmployeeExperienceRespondent[], itemId: number): number {
  const vals = respondents.map((r) => r.scores[itemId]).filter((v): v is number => v !== null);
  return vals.length > 0 ? r1(avg(vals)) : 0;
}

function filterR(
  respondents: EmployeeExperienceRespondent[],
  filters: Record<string, string>
): EmployeeExperienceRespondent[] {
  return respondents.filter((r) =>
    Object.entries(filters).every(([k, v]) => {
      if (!v) return true;
      return (r as unknown as Record<string, unknown>)[k] === v;
    })
  );
}

function uniq(respondents: EmployeeExperienceRespondent[], field: keyof EmployeeExperienceRespondent, min: number): string[] {
  const counts = new Map<string, number>();
  respondents.forEach((r) => {
    const v = r[field] as string;
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v);
}

type DimMetric = {
  id: string; label: string; score: number;
  prevScore: number | null; delta: number | null; itemIds: number[];
};

function buildDims(
  questions: EmployeeExperienceQuestionDefinition[],
  current: EmployeeExperienceRespondent[],
  prior: EmployeeExperienceRespondent[]
): DimMetric[] {
  const byDim = new Map<string, number[]>();
  questions.forEach((q) => {
    const ids = byDim.get(q.dimension) ?? [];
    ids.push(q.itemId);
    byDim.set(q.dimension, ids);
  });
  return orderedDimensionNames(questions).filter((d) => byDim.has(d)).map((dim) => {
    const ids = byDim.get(dim)!;
    const score = groupScore(current, ids);
    const prevScore = prior.length > 0 ? groupScore(prior, ids) : null;
    return { id: dim.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: dim, score, prevScore, delta: prevScore !== null ? r1(score - prevScore) : null, itemIds: ids };
  });
}

function fmtDelta(delta: number | null): string {
  if (delta === null || Number.isNaN(delta)) return "—";
  if (Math.abs(delta) < 0.005) return "±0.0";
  const s = Math.abs(delta * 10).toFixed(1);
  return delta > 0 ? `+${s}` : `-${s}`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function sColor(score: number) { return scoreScaleColor(score, EE.min, EE.mid, EE.max); }
function sTColor(score: number) { return scoreScaleTextColor(score, EE.mid, 0.8, EE.min, EE.max); }

function ScoreChip({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "sm" ? "inline-flex min-w-[48px] justify-center rounded px-1.5 py-0.5 text-xs font-bold" :
    size === "lg" ? "inline-flex min-w-[88px] justify-center rounded-2xl px-4 py-2 text-3xl font-extrabold" :
    "inline-flex min-w-[60px] justify-center rounded-lg px-2.5 py-1 text-sm font-bold";
  return <span className={cls} style={{ backgroundColor: sColor(score), color: sTColor(score) }}>{formatScoreForDisplay(score)}</span>;
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-text-muted"><Minus className="h-3 w-3" />—</span>;
  const pos = delta > 0.005;
  const neg = delta < -0.005;
  const cls = pos ? "bg-nsp-green-100 text-nsp-green-800" : neg ? "bg-nsp-red-100 text-nsp-red-800" : "bg-surface-3 text-text-muted";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>
      {pos ? <ArrowUp className="h-3 w-3" /> : neg ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {fmtDelta(delta)}
    </span>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{children}</p>;
}

function Empty({ message }: { message: string }) {
  return (
    <EEPanel>
      <div className="px-6 py-16 text-center text-sm text-text-muted">{message}</div>
    </EEPanel>
  );
}

// ─── Left Rail ────────────────────────────────────────────────────────────────

function LRail({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">{children}</div>;
}

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
    <div className="overflow-hidden rounded-2xl border border-border-strong bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{title}</span>
        <ChevronRight className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border-subtle px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function CampaignRail({
  campaigns, current, prior, onCurrent, onPrior,
}: {
  campaigns: string[]; current: string; prior: string;
  onCurrent: (v: string) => void; onPrior: (v: string) => void;
}) {
  return (
    <RailSection title="Campaign Selection">
      <div className="mx-auto max-w-[220px] space-y-3 text-center">
        <div>
          <span className="text-xs font-medium text-text-secondary">Current</span>
          <select value={current} onChange={(e) => onCurrent(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none">
            {[...campaigns].reverse().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span className="text-xs font-medium text-text-secondary">Compare To</span>
          <select value={prior} onChange={(e) => onPrior(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none">
            <option value="">No comparison</option>
            {[...campaigns].reverse().filter((c) => c !== current).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </RailSection>
  );
}

function FilterRail({
  filters, onChange, onReset,
}: {
  filters: { id: string; label: string; value: string; options: string[] }[];
  onChange: (id: string, v: string) => void; onReset: () => void;
}) {
  const hasActive = filters.some((f) => f.value);
  return (
    <RailSection title="Filters">
      <div className="mx-auto max-w-[220px] space-y-3 text-center">
        {filters.map((f) => (
          <div key={f.id}>
            <span className="text-xs font-medium text-text-secondary">{f.label}</span>
            <select
              value={f.value} onChange={(e) => onChange(f.id, e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              <option value="">All</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {hasActive && (
          <button type="button" onClick={onReset} className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-center text-xs font-semibold text-text-secondary transition hover:bg-surface-2">
            Reset filters
          </button>
        )}
      </div>
    </RailSection>
  );
}

// ─── Executive: Dimension Wheel ───────────────────────────────────────────────

function DimensionWheel({
  dims,
  orgScore,
  selectedDimension,
  onSelectDimension,
}: {
  dims: DimMetric[];
  orgScore: number;
  selectedDimension: string;
  onSelectDimension: (dimension: string) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const rotRef = useRef(0);

  const n = dims.length;
  if (n === 0) return <Empty message="No dimensions are available for this campaign." />;

  const sliceAngle = 360 / n;
  const activeIdx = Math.max(0, dims.findIndex((dim) => dim.label === selectedDimension));

  function handleNodeClick(i: number) {
    const target = -sliceAngle * i;
    const delta = ((target - rotRef.current) % 360 + 540) % 360 - 180;
    const newRot = rotRef.current + delta;
    rotRef.current = newRot;
    setRotation(newRot);
    onSelectDimension(dims[i].label);
  }

  const W = 480, H = 480;
  const cx = W / 2, cy = H / 2;
  const orbitR = 162;
  const nodeR = 40;
  const activeR = Math.round(nodeR * 1.3); // 52 — 30% larger
  const coreR = 70;
  const font = "Montserrat, ui-sans-serif, sans-serif";

  return (
    <div className="w-full">
      <div className="mb-2 px-1">
        <SLabel>Dimension Wheel</SLabel>
        <p className="mt-0.5 text-xs text-text-muted">
          Click any dimension to bring it to focus
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto w-full max-w-[480px] select-none"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Per-node 3D sphere gradients */}
          {dims.map((dim, i) => (
            <radialGradient
              key={`ng-${i}`}
              id={`dw-ng-${i}`}
              cx="36%"
              cy="27%"
              r="74%"
            >
              <stop offset="0%"   stopColor="white"             stopOpacity={0.56} />
              <stop offset="44%"  stopColor={sColor(dim.score)} stopOpacity={0.02} />
              <stop offset="100%" stopColor="black"             stopOpacity={0.40} />
            </radialGradient>
          ))}

          {/* Core sphere gradient */}
          <radialGradient id="dw-core-ng" cx="36%" cy="27%" r="74%">
            <stop offset="0%"   stopColor="white"              stopOpacity={0.52} />
            <stop offset="44%"  stopColor={sColor(orgScore)}   stopOpacity={0.02} />
            <stop offset="100%" stopColor="black"              stopOpacity={0.44} />
          </radialGradient>

          {/* Drop shadows */}
          <filter id="dw-node-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="1.5" dy="3.5" stdDeviation="5"
              floodColor="rgba(0,0,0,0.38)" />
          </filter>
          <filter id="dw-core-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="3" dy="5" stdDeviation="9"
              floodColor="rgba(0,0,0,0.44)" />
          </filter>
        </defs>

        {/* ── Rotating group: spokes + nodes ── */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.65s cubic-bezier(0.34, 1.26, 0.64, 1)",
          }}
        >
          {dims.map((dim, i) => {
            const deg = -90 + sliceAngle * i;
            const rad = (deg * Math.PI) / 180;
            const x = cx + orbitR * Math.cos(rad);
            const y = cy + orbitR * Math.sin(rad);
            const isActive = i === activeIdx;
            const r = isActive ? activeR : nodeR;
            const labelFs = isActive ? 8.5 : 7;
            const scoreFs = isActive ? 19 : 15;
            const bg = sColor(dim.score);
            const fg = sTColor(dim.score);

            return (
              <g
                key={dim.id}
                onClick={() => handleNodeClick(i)}
                style={{ cursor: "pointer" }}
              >
                {/* Spoke — drawn before node so it sits under */}
                <line
                  x1={cx} y1={cy} x2={x} y2={y}
                  stroke={isActive ? "#89AACA" : "#C0D0DC"}
                  strokeWidth={isActive ? 1.5 : 0.8}
                />

                {/* 3D sphere: shadowed base + gradient sheen overlay */}
                <circle cx={x} cy={y} r={r} fill={bg} filter="url(#dw-node-shadow)" />
                <circle
                  cx={x} cy={y} r={r}
                  fill={`url(#dw-ng-${i})`}
                  style={{ pointerEvents: "none" }}
                />

                {/* Counter-rotating label group — stays upright as wheel spins */}
                <g
                  style={{
                    transformOrigin: `${x}px ${y}px`,
                    transform: `rotate(${-rotation}deg)`,
                    transition: "transform 0.65s cubic-bezier(0.34, 1.26, 0.64, 1)",
                  }}
                >
                  <text
                    x={x}
                    y={y - (isActive ? 6 : 5)}
                    textAnchor="middle"
                    fontSize={labelFs}
                    fontWeight={700}
                    fill={fg}
                    letterSpacing={0.9}
                    fontFamily={font}
                  >
                    {dim.label.toUpperCase()}
                  </text>
                  <text
                    x={x}
                    y={y + (isActive ? 14 : 11)}
                    textAnchor="middle"
                    fontSize={scoreFs}
                    fontWeight={800}
                    fill={fg}
                    fontFamily={font}
                  >
                    {formatScoreForDisplay(dim.score, 1)}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ── Fixed center core — 3D sphere ── */}
        <circle
          cx={cx} cy={cy} r={coreR}
          fill={sColor(orgScore)}
          filter="url(#dw-core-shadow)"
        />
        <circle
          cx={cx} cy={cy} r={coreR}
          fill="url(#dw-core-ng)"
          style={{ pointerEvents: "none" }}
        />
        <text
          x={cx} y={cy - 16}
          textAnchor="middle"
          fontSize={7.5}
          fontWeight={700}
          fill={sTColor(orgScore)}
          letterSpacing={2}
          fontFamily={font}
          opacity={0.8}
        >
          OVERALL INDEX
        </text>
        <text
          x={cx} y={cy + 14}
          textAnchor="middle"
          fontSize={26}
          fontWeight={800}
          fill={sTColor(orgScore)}
          fontFamily={font}
        >
          {formatScoreForDisplay(orgScore, 1)}
        </text>
      </svg>
    </div>
  );
}

// ─── Executive: Campaign Overview ─────────────────────────────────────────────

function CampaignKpi({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[74px] w-[96px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-white/80 px-2.5 py-2 text-center shadow-sm">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold leading-none text-text-primary">{value}</p>
    </div>
  );
}

type StatementRankingRow = {
  id: number;
  name: string;
  value: number;
  delta: number | null;
};

function StatementRankingBars({
  rows,
}: {
  rows: StatementRankingRow[];
}) {
  return (
    <div className="divide-y divide-border-strong/70">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_auto] items-start gap-4 py-2.5">
          <p className="text-sm font-medium leading-snug text-text-primary">{row.name}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <ScoreChip score={row.value} size="sm" />
            <DeltaChip delta={row.delta} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecOverview({
  data, current, prior, locationFilter = "",
}: { data: EmployeeExperienceDashboardData; current: string; prior: string; locationFilter?: string }) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => {
    const rows = data.respondents.filter((r) => r.campaignLabel === current);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, current, locationFilter]);
  const priR = useMemo(() => {
    if (!prior) return [];
    const rows = data.respondents.filter((r) => r.campaignLabel === prior);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, prior, locationFilter]);

  const orgScore = useMemo(() => groupScore(curR, allIds), [curR, allIds]);
  const orgPrior = useMemo(() => priR.length > 0 ? groupScore(priR, allIds) : null, [priR, allIds]);
  const orgDelta = orgPrior !== null ? r1(orgScore - orgPrior) : null;

  const dims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const [selectedOverviewDim, setSelectedOverviewDim] = useState(
    orderedDimensionNames(data.questions)[0] ?? ""
  );
  const activeDim = useMemo(
    () => dims.find((dim) => dim.label === selectedOverviewDim) ?? dims[0] ?? null,
    [dims, selectedOverviewDim]
  );
  const activeStatements = useMemo(() => {
    if (!activeDim) return [];

    return data.questions
      .filter((question) => question.dimension === activeDim.label)
      .map((question) => {
        const score = itemScore(curR, question.itemId);
        const previousScore = priR.length > 0 ? itemScore(priR, question.itemId) : null;

        return {
          id: question.itemId,
          name: question.statement,
          value: score,
          delta: previousScore === null ? null : r1(score - previousScore),
        };
      })
      .sort((left, right) => right.value - left.value || left.id - right.id);
  }, [activeDim, data.questions, curR, priR]);

  if (curR.length < min) return <Empty message="Insufficient responses for the selected campaign." />;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <EEPanel className="bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
        <div className="p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.75fr)_minmax(460px,1.25fr)] lg:items-center">
            <div className="min-w-0">
              <SLabel>Campaign Overview</SLabel>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">Employee Experience - Demo</h2>
              <p className="mt-1 text-lg font-semibold text-text-secondary">{current}</p>
            </div>
            <div className="grid grid-cols-4 justify-items-end gap-2 justify-self-end">
              <CampaignKpi
                label="Responses"
                value={curR.length.toLocaleString()}
              />
              <CampaignKpi
                label="Response Rate"
                value="—"
              />
              <CampaignKpi
                label="Campaign Average"
                value={formatScoreForDisplay(orgScore)}
              />
              <CampaignKpi
                label="Change From Previous"
                value={fmtDelta(orgDelta)}
              />
            </div>
          </div>
        </div>
      </EEPanel>

      {/* Dimension wheel + selected statement rankings */}
      <div className="grid gap-4 xl:grid-cols-2">
        <EEPanel className="bg-gradient-to-br from-white to-[#EBF1F6]/60">
          <div className="flex justify-center p-4">
            <DimensionWheel
              dims={dims}
              orgScore={orgScore}
              selectedDimension={activeDim?.label ?? ""}
              onSelectDimension={setSelectedOverviewDim}
            />
          </div>
        </EEPanel>
        <EEPanel>
          <EEPanelHeader
            className="pb-3"
            title={activeDim ? `${activeDim.label} Statements` : "Statement Rankings"}
            description="Individual statements for the selected dimension, ranked by current campaign average."
          />
          <EEPanelContent className="pt-0">
            {activeStatements.length > 0 ? (
              <StatementRankingBars
                rows={activeStatements}
              />
            ) : (
              <Empty message="Select a dimension to view statement rankings." />
            )}
          </EEPanelContent>
        </EEPanel>
      </div>
    </div>
  );
}

// ─── Executive: Brand Breakdown ──────────────────────────────────────────────

function ExecLocation({
  data, current, prior, locationFilter = "",
}: { data: EmployeeExperienceDashboardData; current: string; prior: string; locationFilter?: string }) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => {
    const rows = data.respondents.filter((r) => r.campaignLabel === current);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, current, locationFilter]);
  const priR = useMemo(() => {
    if (!prior) return [];
    const rows = data.respondents.filter((r) => r.campaignLabel === prior);
    return locationFilter ? rows.filter((r) => r.location === locationFilter) : rows;
  }, [data.respondents, prior, locationFilter]);

  const dims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const dimNames = useMemo(() => dims.map((d) => d.label), [dims]);
  const dimColTotals = useMemo(() => {
    const m: Record<string, number> = {};
    dims.forEach((d) => { m[d.label] = d.score; });
    return m;
  }, [dims]);

  const locations = useMemo(
    () => uniq(curR, "location", min).filter(isKnownBrandSegment),
    [curR, min]
  );
  const locRowTotals = useMemo(() => {
    const m: Record<string, number> = {};
    locations.forEach((loc) => { m[loc] = groupScore(curR.filter((r) => r.location === loc), allIds); });
    return m;
  }, [locations, curR, allIds]);
  const sortedLocs = useMemo(() => [...locations].sort((a, b) => (locRowTotals[b] ?? 0) - (locRowTotals[a] ?? 0)), [locations, locRowTotals]);
  const locHeatData = useMemo(() =>
    locations.map((loc) => {
      const lr = curR.filter((r) => r.location === loc);
      const locDims = buildDims(data.questions, lr, []);
      const scores: Record<string, number | null> = {};
      locDims.forEach((d) => { scores[d.label] = d.score || null; });
      return { department: loc, scores };
    }),
    [locations, curR, data.questions]
  );

  const workTypes = useMemo(() => uniq(curR, "fieldCategory", min), [curR, min]);
  const wtRowTotals = useMemo(() => {
    const m: Record<string, number> = {};
    workTypes.forEach((wt) => { m[wt] = groupScore(curR.filter((r) => r.fieldCategory === wt), allIds); });
    return m;
  }, [workTypes, curR, allIds]);
  const sortedWts = useMemo(() => [...workTypes].sort((a, b) => (wtRowTotals[b] ?? 0) - (wtRowTotals[a] ?? 0)), [workTypes, wtRowTotals]);
  const wtHeatData = useMemo(() =>
    workTypes.map((wt) => {
      const wr = curR.filter((r) => r.fieldCategory === wt);
      const wtDims = buildDims(data.questions, wr, []);
      const scores: Record<string, number | null> = {};
      wtDims.forEach((d) => { scores[d.label] = d.score || null; });
      return { department: wt, scores };
    }),
    [workTypes, curR, data.questions]
  );

  if (curR.length < min) return <Empty message="Insufficient responses for the selected campaign." />;

  return (
    <div className="space-y-6">
      {sortedLocs.length > 0 ? (
        <EEPanel>
          <EEPanelHeader
            title="By Brand"
            description="Score per dimension grouped by company brand. Overall score in the rightmost column."
          />
          <EEPanelContent className="pt-0">
            <HeatmapChart
              rows={sortedLocs}
              columns={dimNames}
              data={locHeatData}
              rowTotals={locRowTotals}
              columnTotals={dimColTotals}
              rowLabelHeader="Brand"
              minValue={EE.min}
              midpoint={EE.mid}
              maxValue={EE.max}
            />
          </EEPanelContent>
        </EEPanel>
      ) : (
        <Empty message="No brands meet the minimum response threshold." />
      )}

      {sortedWts.length > 0 && (
        <EEPanel>
          <EEPanelHeader
            title="By Work Type"
            description="Score per dimension grouped by field category (Field, Office, Shop, etc.)."
          />
          <EEPanelContent className="pt-0">
            <HeatmapChart
              rows={sortedWts}
              columns={dimNames}
              data={wtHeatData}
              rowTotals={wtRowTotals}
              columnTotals={dimColTotals}
              rowLabelHeader="Work Type"
              minValue={EE.min}
              midpoint={EE.mid}
              maxValue={EE.max}
            />
          </EEPanelContent>
        </EEPanel>
      )}
    </div>
  );
}

// ─── HR: Department Rankings ──────────────────────────────────────────────────

function HrRankings({
  data, current, prior, filters,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  filters: Record<string, string>;
}) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priR = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);

  const orgDims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const dimNames = useMemo(() => orgDims.map((d) => d.label), [orgDims]);
  const dimColTotals = useMemo(() => {
    const m: Record<string, number> = {};
    orgDims.forEach((d) => { m[d.label] = d.score; });
    return m;
  }, [orgDims]);

  const depts = useMemo(() => uniq(curR, "department", min), [curR, min]);
  const deptRowTotals = useMemo(() => {
    const m: Record<string, number> = {};
    depts.forEach((dept) => { m[dept] = groupScore(curR.filter((r) => r.department === dept), allIds); });
    return m;
  }, [depts, curR, allIds]);
  const sortedDepts = useMemo(() => [...depts].sort((a, b) => (deptRowTotals[b] ?? 0) - (deptRowTotals[a] ?? 0)), [depts, deptRowTotals]);
  const deptHeatData = useMemo(() =>
    depts.map((dept) => {
      const dc = curR.filter((r) => r.department === dept);
      const deptDims = buildDims(data.questions, dc, []);
      const scores: Record<string, number | null> = {};
      deptDims.forEach((d) => { scores[d.label] = d.score || null; });
      return { department: dept, scores };
    }),
    [depts, curR, data.questions]
  );

  if (sortedDepts.length === 0) return <Empty message="No departments meet the minimum response threshold under the current filters." />;

  return (
    <EEPanel>
      <EEPanelHeader
        title="Department Rankings"
        description={`${sortedDepts.length} department${sortedDepts.length !== 1 ? "s" : ""} · ${current} · sorted by overall score.`}
      />
      <EEPanelContent className="pt-0">
        <HeatmapChart
          rows={sortedDepts}
          columns={dimNames}
          data={deptHeatData}
          rowTotals={deptRowTotals}
          columnTotals={dimColTotals}
          rowLabelHeader="Department"
          minValue={EE.min}
          midpoint={EE.mid}
          maxValue={EE.max}
        />
      </EEPanelContent>
    </EEPanel>
  );
}

// ─── HR: Index Deep Dive ──────────────────────────────────────────────────────

function HrIndexDive({
  data, current, prior, selectedDim, filters,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  selectedDim: string; filters: Record<string, string>;
}) {
  const min = data.settings.minimumSegmentSize;
  const curR = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priR = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);

  const dimQs = useMemo(() => data.questions.filter((q) => q.dimension === selectedDim), [data.questions, selectedDim]);
  const dimIds = useMemo(() => dimQs.map((q) => q.itemId), [dimQs]);
  const dimAvg = useMemo(() => groupScore(curR, dimIds), [curR, dimIds]);

  const stmts = useMemo(() =>
    dimQs.map((q) => {
      const score = itemScore(curR, q.itemId);
      const prev = priR.length >= min ? itemScore(priR, q.itemId) : null;
      return { ...q, score, prev, delta: prev !== null ? r1(score - prev) : null };
    }).sort((a, b) => b.score - a.score),
    [dimQs, curR, priR, min]
  );

  const depts = useMemo(() => uniq(curR, "department", min), [curR, min]);
  const deptBars = useMemo(() =>
    depts.map((dept) => {
      const dc = curR.filter((r) => r.department === dept);
      return { name: dept, value: groupScore(dc, dimIds) };
    }).sort((a, b) => b.value - a.value),
    [depts, curR, dimIds]
  );

  if (!selectedDim || dimQs.length === 0) return <Empty message="Select a dimension from the left rail." />;

  return (
    <div className="space-y-6">
      <EEPanel>
        <EEPanelHeader
          title={`${selectedDim} — Statement Detail`}
          description="All items ranked highest to lowest. Delta reflects change vs prior campaign."
        />
        <EEPanelContent className="pt-0">
          <div className="overflow-hidden rounded-2xl border border-[#8798AA]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-[#E2E8EF] py-[11px] pl-[14px] pr-4 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Statement</th>
                <th className="bg-[#E2E8EF] px-3 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">{current}</th>
                {prior && <th className="col-group-start bg-[#E2E8EF] px-3 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Δ</th>}
              </tr>
            </thead>
            <tbody>
              {stmts.map((q, i) => (
                <tr key={q.itemId} className={`border-t border-[#D3DDE7] ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-3 pl-[14px] pr-4 text-[13px] leading-relaxed text-text-primary">{q.statement}</td>
                  <td className="px-3 py-3 text-center"><ScoreChip score={q.score} size="sm" /></td>
                  {prior && <td className="col-group-start px-3 py-3 text-center"><DeltaChip delta={q.delta} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </EEPanelContent>
      </EEPanel>

      {deptBars.length > 0 && (
        <EEPanel>
          <EEPanelHeader
            title={`${selectedDim} by Department`}
            description="Which departments score highest and lowest on this index."
          />
          <EEPanelContent className="pt-0">
            <GradientBarChart
              data={deptBars}
              average={dimAvg}
              minValue={EE.min} midpoint={EE.mid} maxValue={EE.max}
              height={Math.max(280, deptBars.length * 34)}
            />
          </EEPanelContent>
        </EEPanel>
      )}
    </div>
  );
}

// ─── HR: Supervisor Reports ───────────────────────────────────────────────────

function SupervisorBenchmark({ rows }: { rows: { id: number; statement: string; score: number; orgScore: number }[] }) {
  const range = EE.max - EE.min;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        <span>Org avg</span>
        <span className="inline-block h-3 w-3 rounded-full border-2 border-[#6B4A2D] bg-[#F0A06C]" />
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const curPct = Math.min(100, Math.max(0, ((row.score - EE.min) / range) * 100));
          const orgPct = Math.min(100, Math.max(0, ((row.orgScore - EE.min) / range) * 100));
          return (
            <div key={row.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <p className="mb-1.5 text-xs leading-snug text-text-secondary">{row.statement}</p>
              <div className="relative h-8 rounded border border-[#B5BCC6] bg-white">
                <div className="absolute left-0 top-0 flex h-full items-center rounded px-2 text-xs font-bold" style={{ width: `${Math.max(curPct, 10)}%`, backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                  {formatScoreForDisplay(row.score)}
                </div>
                <div className="absolute bottom-[-4px] top-[-4px] w-px bg-[#2E3E4F]" style={{ left: `${orgPct}%` }} />
                <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-[#6B4A2D] bg-[#F0A06C]" style={{ left: `calc(${orgPct}% - 6px)` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-1 text-xs text-text-muted">
        <span>{EE.minLabel}</span><span>{formatScoreForDisplay(EE.mid)}</span><span>{EE.maxLabel}</span>
      </div>
    </div>
  );
}

function HrSupervisor({
  data, current, prior, filters, selectedSup, onSelectSup,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  filters: Record<string, string>; selectedSup: string; onSelectSup: (v: string) => void;
}) {
  const min = data.settings.minimumSegmentSize;
  const curAll = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priAll = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);

  const sups = useMemo(() => uniq(curAll, "supervisor", min), [curAll, min]);
  const activeSup = selectedSup || sups[0] || "";

  const supQ = useMemo(() => data.questions.filter((q) => q.dimension === "Supervisor"), [data.questions]);
  const supIds = useMemo(() => supQ.map((q) => q.itemId), [supQ]);

  const supCur = useMemo(() => curAll.filter((r) => r.supervisor === activeSup), [curAll, activeSup]);
  const supPri = useMemo(() => priAll.filter((r) => r.supervisor === activeSup), [priAll, activeSup]);

  const supScore = useMemo(() => groupScore(supCur, supIds), [supCur, supIds]);
  const supPrevScore = useMemo(() => supPri.length >= min ? groupScore(supPri, supIds) : null, [supPri, supIds, min]);
  const supDelta = supPrevScore !== null ? r1(supScore - supPrevScore) : null;
  const orgSupScore = useMemo(() => groupScore(curAll, supIds), [curAll, supIds]);
  const benchGap = r1(supScore - orgSupScore);

  const supScores = useMemo(() => {
    const m: Record<string, number> = {};
    sups.forEach((s) => { m[s] = groupScore(curAll.filter((r) => r.supervisor === s), allIds); });
    return m;
  }, [sups, curAll, allIds]);

  const rank = [...sups].sort((a, b) => (supScores[b] ?? 0) - (supScores[a] ?? 0)).indexOf(activeSup) + 1;

  const qRows = useMemo(() =>
    supQ.map((q) => {
      const score = itemScore(supCur, q.itemId);
      const prev = supPri.length >= min ? itemScore(supPri, q.itemId) : null;
      const orgScore = itemScore(curAll, q.itemId);
      return { id: q.itemId, statement: q.statement, score, prev, delta: prev !== null ? r1(score - prev) : null, orgScore };
    }).sort((a, b) => b.score - a.score),
    [supQ, supCur, supPri, curAll, min]
  );

  if (sups.length === 0) return <Empty message="No supervisors meet the minimum response threshold under the current filters." />;

  const deltaStyle = (d: number | null) =>
    d === null ? "bg-surface-2 text-text-primary" : d > 0.005 ? "bg-nsp-green-50 text-nsp-green-900" : d < -0.005 ? "bg-nsp-red-50 text-nsp-red-900" : "bg-surface-2 text-text-primary";

  return (
    <div className="space-y-6">
      <div>
        <SLabel>Supervisor Report</SLabel>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">{activeSup || "No supervisor selected"}</h2>
        <p className="mt-1 text-sm text-text-secondary">{supCur.length} responses · {current}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border-strong bg-white px-4 py-4 shadow-sm">
          <SLabel>Responses</SLabel>
          <p className="mt-2 text-4xl font-extrabold text-text-primary">{supCur.length}</p>
          <p className="mt-1 text-xs text-text-muted">{current}</p>
        </div>
        <div className="rounded-2xl border border-border-strong px-4 py-4 shadow-sm" style={{ backgroundColor: sColor(supScore), color: sTColor(supScore) }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Current Avg</p>
          <p className="mt-2 text-4xl font-extrabold">{formatScoreForDisplay(supScore)}</p>
          <p className="mt-1 text-xs opacity-80">{current}</p>
        </div>
        <div className={`rounded-2xl border border-border-strong px-4 py-4 shadow-sm ${deltaStyle(supDelta)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Campaign Delta</p>
          <p className="mt-2 text-4xl font-extrabold">{fmtDelta(supDelta)}</p>
          <p className="mt-1 text-xs opacity-80">{prior || "No comparison"}</p>
        </div>
        <div className={`rounded-2xl border border-border-strong px-4 py-4 shadow-sm ${deltaStyle(benchGap)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Rank / Org Gap</p>
          <p className="mt-2 text-3xl font-extrabold">{rank}/{sups.length}</p>
          <p className="mt-1 text-xs opacity-80">vs org avg: {fmtDelta(benchGap)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <EEPanel>
          <EEPanelHeader
            title="Supervisor Item Table"
            description="Team score vs. org average per item. Delta vs prior campaign."
          />
          <EEPanelContent className="pt-0">
            <div className="overflow-hidden rounded-2xl border border-[#8798AA]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="bg-[#E2E8EF] py-[11px] pl-[14px] pr-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Statement</th>
                  <th className="bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Score</th>
                  <th className="bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Org Avg</th>
                  <th className="col-group-start bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Δ</th>
                </tr>
              </thead>
              <tbody>
                {qRows.map((row, i) => (
                  <tr key={row.id} className={`border-t border-[#D3DDE7] ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                    <td className="py-3 pl-[14px] pr-3 text-[12px] leading-relaxed text-text-primary">{row.statement}</td>
                    <td className="px-2 py-3 text-center"><ScoreChip score={row.score} size="sm" /></td>
                    <td className="px-2 py-3 text-center font-semibold text-text-secondary">{formatScoreForDisplay(row.orgScore)}</td>
                    <td className="col-group-start px-2 py-3 text-center"><DeltaChip delta={row.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </EEPanelContent>
        </EEPanel>

        <EEPanel>
          <EEPanelHeader
            title="Benchmark Comparison"
            description="Bar = supervisor score. Orange dot = organization supervisor average."
          />
          <EEPanelContent className="pt-0">
            <SupervisorBenchmark rows={qRows} />
          </EEPanelContent>
        </EEPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <EEPanel>
          <EEPanelHeader title="Strengths to Protect" description="Highest-scoring supervisor items." />
          <EEPanelContent className="space-y-3 pt-0">
            {qRows.slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Strength · {formatScoreForDisplay(row.score)}</p>
                <p className="mt-1 text-sm leading-relaxed">{row.statement}</p>
              </div>
            ))}
          </EEPanelContent>
        </EEPanel>
        <EEPanel>
          <EEPanelHeader title="Manager Priorities" description="Lowest-scoring items to address." />
          <EEPanelContent className="space-y-3 pt-0">
            {[...qRows].sort((a, b) => a.score - b.score).slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Priority · {formatScoreForDisplay(row.score)}</p>
                <p className="mt-1 text-sm leading-relaxed">{row.statement}</p>
              </div>
            ))}
          </EEPanelContent>
        </EEPanel>
      </div>
    </div>
  );
}

// ─── HR: Open Text ────────────────────────────────────────────────────────────

function HrOpenText({
  data, current, deptFilter, fieldType,
}: {
  data: EmployeeExperienceDashboardData; current: string;
  deptFilter: string; fieldType: OpenTextField;
}) {
  const fieldLabel = OPEN_TEXT_FIELDS.find((f) => f.id === fieldType)?.label ?? fieldType;

  const entries = useMemo(() =>
    data.voice[fieldType].filter((e) => {
      if (e.campaign !== current) return false;
      if (deptFilter && e.department !== deptFilter) return false;
      return e.text && e.text.trim().length > 0;
    }),
    [data.voice, fieldType, current, deptFilter]
  );

  return (
    <div className="space-y-6">
      <div>
        <SLabel>Open Text · {fieldLabel}</SLabel>
        <p className="mt-2 text-sm text-text-secondary">
          {entries.length} response{entries.length !== 1 ? "s" : ""}{deptFilter ? ` from ${deptFilter}` : " across all departments"} · {current}
        </p>
      </div>
      {entries.length === 0 ? (
        <Empty message="No responses match the current selection." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={entry.id} className="rounded-2xl border border-[#8798AA] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-text-muted">{i + 1}</div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-text-primary">{entry.text}</p>
                  {entry.department && <p className="mt-1.5 text-xs text-text-muted">{entry.department}{entry.location ? ` · ${entry.location}` : ""}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Department: Scorecard ────────────────────────────────────────────────────

function DeptScorecard({
  data, current, prior, selectedDept,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string; selectedDept: string;
}) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);

  const curAll = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const priAll = useMemo(() => prior ? data.respondents.filter((r) => r.campaignLabel === prior) : [], [data.respondents, prior]);

  const dc = useMemo(() => curAll.filter((r) => r.department === selectedDept), [curAll, selectedDept]);
  const dp = useMemo(() => priAll.filter((r) => r.department === selectedDept), [priAll, selectedDept]);

  const deptScore = useMemo(() => groupScore(dc, allIds), [dc, allIds]);
  const deptPrev = useMemo(() => dp.length >= min ? groupScore(dp, allIds) : null, [dp, allIds, min]);
  const deptDelta = deptPrev !== null ? r1(deptScore - deptPrev) : null;

  const dims = useMemo(() => buildDims(data.questions, dc, dp.length >= min ? dp : []), [data.questions, dc, dp, min]);

  const allStmts = useMemo(() =>
    data.questions.map((q) => {
      const score = itemScore(dc, q.itemId);
      const prev = dp.length >= min ? itemScore(dp, q.itemId) : null;
      return { ...q, score, prev, delta: prev !== null ? r1(score - prev) : null };
    }).sort((a, b) => b.score - a.score),
    [data.questions, dc, dp, min]
  );

  const topStmts = allStmts.slice(0, 8);
  const focusStmts = [...allStmts].reverse().slice(0, 8);

  const demoCuts = useMemo(() => {
    const fields: { id: keyof EmployeeExperienceRespondent; label: string }[] = [
      { id: "location", label: "Brand" },
      { id: "fieldCategory", label: "Work Type" },
      { id: "tenure", label: "Tenure" },
      { id: "generation", label: "Generation" },
      { id: "leadership", label: "Leadership" },
    ];
    return fields.map(({ id, label }) => {
      const groups = uniq(dc, id, min);
      const rows = groups.map((g) => {
        const gc = dc.filter((r) => r[id] === g);
        const gp = dp.filter((r) => r[id] === g);
        const score = groupScore(gc, allIds);
        const prev = gp.length >= min ? groupScore(gp, allIds) : null;
        return { label: g, n: gc.length, score, delta: prev !== null ? r1(score - prev) : null };
      }).sort((a, b) => b.score - a.score);
      return { id: id as string, label, rows };
    }).filter((c) => c.rows.length > 0);
  }, [dc, dp, allIds, min]);

  if (!selectedDept) return <Empty message="Select a department from the left rail." />;
  if (dc.length < min) return <Empty message={`${selectedDept} does not meet the minimum response threshold (${min}).`} />;

  function StmtTable({ title, desc, stmts }: { title: string; desc: string; stmts: typeof allStmts }) {
    return (
      <EEPanel>
        <EEPanelHeader title={title} description={desc} />
        <EEPanelContent className="pt-0">
          <div className="overflow-hidden rounded-2xl border border-[#8798AA]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-[#E2E8EF] py-[11px] pl-[14px] pr-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Statement</th>
                <th className="bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Score</th>
                <th className="col-group-start bg-[#E2E8EF] px-2 py-[11px] text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Δ</th>
              </tr>
            </thead>
            <tbody>
              {stmts.map((q, i) => (
                <tr key={q.itemId} className={`border-t border-[#D3DDE7] ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-2.5 pl-[14px] pr-3 text-[12px] leading-relaxed text-text-primary">{q.statement}</td>
                  <td className="px-2 py-2.5 text-center"><ScoreChip score={q.score} size="sm" /></td>
                  <td className="col-group-start px-2 py-2.5 text-center"><DeltaChip delta={q.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </EEPanelContent>
      </EEPanel>
    );
  }

  return (
    <div className="space-y-6">
      <EEPanel className="bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SLabel>Department Scorecard · {current}</SLabel>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">{selectedDept}</h2>
              <p className="mt-1.5 text-sm text-text-secondary">{dc.length} {dc.length === 1 ? "response" : "responses"}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreChip score={deptScore} size="lg" />
              <DeltaChip delta={deptDelta} />
            </div>
          </div>
        </div>
      </EEPanel>

      {/* Index tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dims.map((dim) => (
          <div key={dim.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[#8798AA] bg-white px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{dim.label}</p>
              <p className="mt-0.5 text-2xl font-extrabold text-text-primary">{formatScoreForDisplay(dim.score)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-8 w-8 rounded-xl" style={{ backgroundColor: sColor(dim.score) }} />
              <DeltaChip delta={dim.delta} />
            </div>
          </div>
        ))}
      </div>

      {/* Statement tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <StmtTable title="Top Statements" desc="Highest-scoring items for this department." stmts={topStmts} />
        <StmtTable title="Focus Areas" desc="Lowest-scoring items for this department." stmts={focusStmts} />
      </div>

      {/* Demographic cuts */}
      {demoCuts.length > 0 && (
        <div>
          <SLabel>Demographic Cuts</SLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {demoCuts.map((cut) => (
              <EEPanel key={cut.id}>
                <EEPanelHeader title={cut.label} className="pb-2 pt-5" />
                <EEPanelContent className="space-y-2 pt-0">
                  {cut.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{row.label} ({row.n})</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ScoreChip score={row.score} size="sm" />
                        <DeltaChip delta={row.delta} />
                      </div>
                    </div>
                  ))}
                </EEPanelContent>
              </EEPanel>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DwsEmployeeExperienceDashboardClient({
  data,
  logoUrl,
  dashboardInstanceId,
  canEditGuidance = false,
}: {
  data: EmployeeExperienceDashboardData;
  logoUrl?: string;
  dashboardInstanceId?: string;
  canEditGuidance?: boolean;
}) {
  const [activeGroup, setActiveGroup] = useState<GroupId>("executive");
  const [activePersp, setActivePersp] = useState<PerspectiveId>("exec-overview");
  const [current, setCurrent] = useState(data.meta.currentCampaignLabel);
  const [prior, setPrior] = useState(data.meta.priorCampaignLabel ?? "");

  const [hrRankFilters, setHrRankFilters] = useState<Record<string, string>>({ location: "", fieldCategory: "" });
  const dimensionOptions = useMemo(() => orderedDimensionNames(data.questions), [data.questions]);
  const [selectedDim, setSelectedDim] = useState(dimensionOptions[0] ?? "");
  const [idxFilters, setIdxFilters] = useState<Record<string, string>>({ location: "", fieldCategory: "" });
  const [supFilters, setSupFilters] = useState<Record<string, string>>({ location: "", department: "" });
  const [selectedSup, setSelectedSup] = useState("");
  const [openTextDept, setOpenTextDept] = useState("");
  const [openTextField, setOpenTextField] = useState<OpenTextField>("strengths");
  const [selectedDept, setSelectedDept] = useState("");
  const [execCompId, setExecCompId] = useState("");
  const [execIndexId, setExecIndexId] = useState("");
  const [execLocation, setExecLocation] = useState("");

  const min = data.settings.minimumSegmentSize;
  const curR = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const hiddenDimensionIds = useMemo(
    () => new Set(mergeHiddenDimensionIds(data.settings.hiddenDimensionIds ?? [])),
    [data.settings.hiddenDimensionIds]
  );
  const openTextFields = useMemo(
    () => OPEN_TEXT_FIELDS.filter((field) => !field.dimensionId || !hiddenDimensionIds.has(field.dimensionId)),
    [hiddenDimensionIds]
  );

  const locationOpts = useMemo(
    () => uniq(curR, "location", min).filter(isKnownBrandSegment),
    [curR, min]
  );
  const workTypeOpts = useMemo(() => uniq(curR, "fieldCategory", min), [curR, min]);
  const deptOpts = useMemo(() => uniq(curR, "department", min), [curR, min]);

  const supCurFiltered = useMemo(() => filterR(curR, supFilters), [curR, supFilters]);
  const supOpts = useMemo(() => uniq(supCurFiltered, "supervisor", min), [supCurFiltered, min]);
  const deptScores = useMemo(() => {
    const m: Record<string, number> = {};
    deptOpts.forEach((d) => { m[d] = groupScore(curR.filter((r) => r.department === d), allIds); });
    return m;
  }, [deptOpts, curR, allIds]);
  const supScores = useMemo(() => {
    const m: Record<string, number> = {};
    supOpts.forEach((s) => { m[s] = groupScore(supCurFiltered.filter((r) => r.supervisor === s), allIds); });
    return m;
  }, [supOpts, supCurFiltered, allIds]);

  const groupDef = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];
  const reportBundle = useMemo(
    () => buildEmployeeExperienceReportBundle(data, { logoUrl, campaignLabel: current }),
    [data, logoUrl, current]
  );
  const executiveIndexes = useMemo(
    () => reportBundle.campaignResults.indexes.map((index) => ({ id: index.id, name: index.name })),
    [reportBundle]
  );
  const executiveComparisons = reportBundle.campaignResults.comparisons;
  const activeExecCompId = execCompId || defaultComparisonId(executiveComparisons);
  const activeExecIndexId = execIndexId || executiveIndexes[0]?.id || "";
  const brandLocations = locationOpts;

  const executiveRail = EXECUTIVE_PERSPECTIVES.has(activePersp) ? (
    <EEExecutiveRail
      logoUrl={logoUrl}
      clientName={data.meta.organizationName}
      perspectiveTitle={EXECUTIVE_PERSPECTIVE_TITLES[activePersp]}
      campaigns={data.meta.campaigns}
      current={current}
      prior={prior}
      onCurrent={setCurrent}
      onPrior={setPrior}
      comparisons={executiveComparisons}
      compId={activeExecCompId}
      onCompId={setExecCompId}
      indexes={executiveIndexes}
      indexId={activeExecIndexId}
      onIndexId={setExecIndexId}
      locations={brandLocations}
      location={execLocation}
      onLocation={setExecLocation}
    />
  ) : null;

  function renderGuidance(perspectiveId: string, filterKey: string) {
    return (
      <GuidancePinRail
        dashboardInstanceId={dashboardInstanceId}
        perspectiveId={perspectiveId}
        campaignLabel={current}
        filterKey={filterKey || "default"}
        canEdit={canEditGuidance}
        className="hidden xl:flex xl:flex-col xl:gap-4 xl:p-6"
        style={EE_GUIDANCE_RAIL_STYLE}
      />
    );
  }

  function onGroupChange(gid: string) {
    const g = GROUPS.find((x) => x.id === gid) ?? GROUPS[0];
    setActiveGroup(g.id);
    setActivePersp(g.perspectives[0].id as PerspectiveId);
  }

  // ── Left Rail ──────────────────────────────────────────────────────────────

  const leftRail = (
    <LRail>
      <CampaignRail
        campaigns={data.meta.campaigns}
        current={current}
        prior={prior}
        onCurrent={setCurrent}
        onPrior={setPrior}
      />

      {/* Filters */}
      {(activePersp === "hr-rankings") && (
        <FilterRail
          filters={[
            { id: "location", label: "Brand", value: hrRankFilters.location, options: locationOpts },
            { id: "fieldCategory", label: "Work Type", value: hrRankFilters.fieldCategory, options: workTypeOpts },
          ]}
          onChange={(id, v) => setHrRankFilters((f) => ({ ...f, [id]: v }))}
          onReset={() => setHrRankFilters({ location: "", fieldCategory: "" })}
        />
      )}
      {(activePersp === "hr-index-dive") && (
        <FilterRail
          filters={[
            { id: "location", label: "Brand", value: idxFilters.location, options: locationOpts },
            { id: "fieldCategory", label: "Work Type", value: idxFilters.fieldCategory, options: workTypeOpts },
          ]}
          onChange={(id, v) => setIdxFilters((f) => ({ ...f, [id]: v }))}
          onReset={() => setIdxFilters({ location: "", fieldCategory: "" })}
        />
      )}
      {(activePersp === "hr-supervisor") && (
        <FilterRail
          filters={[
            { id: "location", label: "Brand", value: supFilters.location, options: locationOpts },
            { id: "department", label: "Department", value: supFilters.department, options: deptOpts },
          ]}
          onChange={(id, v) => setSupFilters((f) => ({ ...f, [id]: v }))}
          onReset={() => setSupFilters({ location: "", department: "" })}
        />
      )}

      {/* Dimension selector (Index Deep Dive) */}
      {activePersp === "hr-index-dive" && (
        <RailSection title="Dimension">
          <div className="space-y-0.5">
            {dimensionOptions.map((d) => (
              <button
                key={d} type="button" onClick={() => setSelectedDim(d)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition
                  ${selectedDim === d ? "bg-nsp-blue-50 font-semibold text-nsp-blue-700" : "font-medium text-text-secondary hover:bg-surface-2"}`}
              >
                {d}
                {selectedDim === d && <ChevronRight className="h-4 w-4 text-nsp-blue-400" />}
              </button>
            ))}
          </div>
        </RailSection>
      )}

      {/* Focus: Supervisor selector */}
      {activePersp === "hr-supervisor" && supOpts.length > 0 && (
        <RailSection title="Focus">
          <div>
            <span className="text-xs font-medium text-text-secondary">Supervisor</span>
            <select
              value={selectedSup || supOpts[0] || ""}
              onChange={(e) => setSelectedSup(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              {supOpts.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </RailSection>
      )}

      {/* Focus: Open Text field + department */}
      {activePersp === "hr-open-text" && (
        <RailSection title="Focus">
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-text-secondary">Question Type</span>
              <select
                value={openTextField}
                onChange={(e) => setOpenTextField(e.target.value as OpenTextField)}
                className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
              >
                {openTextFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <span className="text-xs font-medium text-text-secondary">Department</span>
              <select value={openTextDept} onChange={(e) => setOpenTextDept(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none">
                <option value="">All Departments</option>
                {deptOpts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </RailSection>
      )}

      {/* Focus: Department scorecard selector */}
      {activePersp === "dept-scorecard" && deptOpts.length > 0 && (
        <RailSection title="Focus">
          <div>
            <span className="text-xs font-medium text-text-secondary">Department</span>
            <select
              value={selectedDept || deptOpts[0] || ""}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              {deptOpts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </RailSection>
      )}
    </LRail>
  );

  const content = useMemo(() => {
    switch (activePersp) {
      case "ee-campaign-results":
        return (
          <EECampaignResults
            data={reportBundle.campaignResults}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
          />
        );
      case "ee-department-comparison":
        return (
          <EEDepartmentComparison
            data={reportBundle.departmentComparison}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
          />
        );
      case "ee-location-comparison":
        return (
          <EELocationComparison
            data={reportBundle.locationComparison}
            dashboardInstanceId={dashboardInstanceId}
            canEditGuidance={canEditGuidance}
            executiveRail={executiveRail}
            indexId={activeExecIndexId}
            onIndexId={setExecIndexId}
            compId={activeExecCompId}
            onCompId={setExecCompId}
          />
        );
      case "exec-overview":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            <main style={EE_PERSPECTIVE_MAIN_STYLE}>
              <ExecOverview data={data} current={current} prior={prior} locationFilter={execLocation} />
            </main>
            {renderGuidance("exec-overview", activeExecIndexId)}
          </div>
        );
      case "exec-location":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            <main style={EE_PERSPECTIVE_MAIN_STYLE}>
              <ExecLocation data={data} current={current} prior={prior} locationFilter={execLocation} />
            </main>
            {renderGuidance("exec-location", activeExecIndexId)}
          </div>
        );
      case "ee-historical-report":
        return (
          <div className="block" style={EE_PERSPECTIVE_CANVAS_STYLE}>
            {executiveRail}
            <div style={{ ...EE_PERSPECTIVE_MAIN_STYLE, padding: 0 }}>
              <EEHistoricalReport data={reportBundle.historicalReport} embedded />
            </div>
            {renderGuidance("ee-historical-report", activeExecIndexId)}
          </div>
        );
      case "hr-rankings":
        return <HrRankings data={data} current={current} prior={prior} filters={hrRankFilters} />;
      case "hr-index-dive":
        return <HrIndexDive data={data} current={current} prior={prior} selectedDim={selectedDim} filters={idxFilters} />;
      case "hr-supervisor":
        return (
          <>
            <EESupervisorReport data={reportBundle.supervisorReport} />
            {renderGuidance("hr-supervisor", "default")}
          </>
        );
      case "hr-open-text":
        return <HrOpenText data={data} current={current} deptFilter={openTextDept} fieldType={openTextField} />;
      case "dept-scorecard":
        return <DeptScorecard data={data} current={current} prior={prior} selectedDept={selectedDept || deptOpts[0] || ""} />;
      case "ee-department-report":
        return (
          <>
            <EEDepartmentReport data={reportBundle.departmentReport} />
            {renderGuidance("ee-department-report", "default")}
          </>
        );
      default: return null;
    }
  }, [activePersp, data, current, prior, hrRankFilters, selectedDim, idxFilters, supFilters, selectedSup, supOpts, openTextDept, openTextField, selectedDept, deptOpts, reportBundle, dashboardInstanceId, canEditGuidance, executiveRail, activeExecIndexId, activeExecCompId, execLocation]);

  return (
    <>
      <DashboardRibbon
        title="Employee Experience"
        categories={GROUPS.map((g) => ({ id: g.id, label: g.label }))}
        activeCategoryId={activeGroup}
        onCategoryChange={onGroupChange}
        perspectives={groupDef.perspectives.map((p) => ({ id: p.id, label: p.label }))}
        activePerspectiveId={activePersp}
        onPerspectiveChange={(id) => setActivePersp(id as PerspectiveId)}
      />
      {EXECUTIVE_PERSPECTIVES.has(activePersp) ||
      activePersp === "ee-campaign-results" ||
      activePersp === "ee-department-comparison" ||
      activePersp === "ee-location-comparison" ||
      activePersp === "hr-supervisor" ||
      activePersp === "ee-department-report"
        ? content
        : <DashboardCanvas leftRail={leftRail}>{content}</DashboardCanvas>}
    </>
  );
}
