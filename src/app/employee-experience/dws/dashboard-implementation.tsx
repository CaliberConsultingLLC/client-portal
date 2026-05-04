"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Minus } from "lucide-react";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { NspRadarChart } from "@/components/charts/nsp-radar-chart";
import { ColorLegend } from "@/components/collaboration/color-legend";
import { scoreScaleColor, scoreScaleTextColor } from "@/components/collaboration/score-color-scale";
import { DashboardCanvas, DashboardRibbon } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceRespondent,
} from "@/types/employee-experience";

// ─── Constants ────────────────────────────────────────────────────────────────

const EE = { min: 6, mid: 7.25, max: 8.5, minLabel: "60", maxLabel: "85" } as const;

const DIM_ORDER = ["Acquisition", "Culture", "Daily Work", "Intent", "Supervisor", "Engage", "Balance"];

const GROUPS = [
  {
    id: "executive" as const,
    label: "Executive",
    perspectives: [
      { id: "exec-overview" as const, label: "Campaign Overview" },
      { id: "exec-location" as const, label: "Location Breakdown" },
    ],
  },
  {
    id: "hr" as const,
    label: "HR",
    perspectives: [
      { id: "hr-rankings" as const, label: "Department Rankings" },
      { id: "hr-index-dive" as const, label: "Index Deep Dive" },
      { id: "hr-supervisor" as const, label: "Supervisor Reports" },
      { id: "hr-open-text" as const, label: "Open Text" },
    ],
  },
  {
    id: "department" as const,
    label: "Department",
    perspectives: [
      { id: "dept-scorecard" as const, label: "Department Scorecard" },
    ],
  },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];
type PerspectiveId =
  | "exec-overview" | "exec-location"
  | "hr-rankings" | "hr-index-dive" | "hr-supervisor" | "hr-open-text"
  | "dept-scorecard";

const OPEN_TEXT_FIELDS = [
  { id: "strengths" as const, label: "Greatest Strengths" },
  { id: "improvement" as const, label: "Desired Changes" },
  { id: "supervisor" as const, label: "Supervisor Feedback" },
  { id: "acquisition" as const, label: "Acquisition Comments" },
];
type OpenTextField = "strengths" | "improvement" | "supervisor" | "acquisition";

// ─── Utilities ────────────────────────────────────────────────────────────────

function r1(v: number) { return Math.round(v * 10) / 10; }

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
  return DIM_ORDER.filter((d) => byDim.has(d)).map((dim) => {
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

function PgHeader({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <SLabel>{label}</SLabel>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">{description}</p>}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <Card className="border-border-strong">
      <CardContent className="px-6 py-16 text-center text-sm text-text-muted">{message}</CardContent>
    </Card>
  );
}

// ─── Score table shared component ────────────────────────────────────────────

type ScoreTableRow = {
  label: string; n?: number;
  score: number; delta: number | null;
  dims?: DimMetric[];
};

function CrossTabTable({
  title, description, rows, dims, orgRow,
}: {
  title: string; description?: string;
  rows: ScoreTableRow[]; dims: DimMetric[];
  orgRow?: ScoreTableRow;
}) {
  return (
    <Card className="border-border-strong">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">
        <table className="w-full min-w-[580px] text-sm">
          <thead>
            <tr className="border-b border-border-strong">
              <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Group</th>
              <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">n</th>
              {dims.map((d) => (
                <th key={d.id} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{d.label}</th>
              ))}
              <th className="pl-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Total</th>
              <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                <td className="py-3 pr-4 font-semibold text-text-primary">{row.label}</td>
                <td className="px-2 py-3 text-center text-text-muted">{row.n ?? "—"}</td>
                {dims.map((d) => {
                  const rd = row.dims?.find((x) => x.label === d.label);
                  return (
                    <td key={d.id} className="px-2 py-3 text-center">
                      {rd ? <ScoreChip score={rd.score} size="sm" /> : <span className="text-text-muted">—</span>}
                    </td>
                  );
                })}
                <td className="pl-3 py-3 text-center"><ScoreChip score={row.score} size="sm" /></td>
                <td className="px-2 py-3 text-center"><DeltaChip delta={row.delta} /></td>
              </tr>
            ))}
            {orgRow && (
              <tr className="border-t-2 border-border-strong bg-nsp-blue-50/60 font-bold">
                <td className="py-3 pr-4 font-bold text-text-primary">{orgRow.label}</td>
                <td className="px-2 py-3 text-center text-text-muted">{orgRow.n ?? "—"}</td>
                {dims.map((d) => {
                  const rd = orgRow.dims?.find((x) => x.label === d.label);
                  return (
                    <td key={d.id} className="px-2 py-3 text-center">
                      {rd ? <ScoreChip score={rd.score} size="sm" /> : <span className="text-text-muted">—</span>}
                    </td>
                  );
                })}
                <td className="pl-3 py-3 text-center"><ScoreChip score={orgRow.score} size="sm" /></td>
                <td className="px-2 py-3 text-center"><DeltaChip delta={orgRow.delta} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Left Rail components ─────────────────────────────────────────────────────

function LRail({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">{children}</div>;
}

function CampaignRail({
  campaigns, current, prior, onCurrent, onPrior, orgName,
}: {
  campaigns: string[]; current: string; prior: string;
  onCurrent: (v: string) => void; onPrior: (v: string) => void; orgName: string;
}) {
  return (
    <Card className="border-border-strong">
      <CardContent className="space-y-4 p-5">
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <SLabel>Organization</SLabel>
          <p className="mt-1 text-sm font-semibold text-text-primary">{orgName}</p>
        </div>
        <div>
          <SLabel>Current Campaign</SLabel>
          <select value={current} onChange={(e) => onCurrent(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm font-semibold text-text-primary focus:border-nsp-blue-300 focus:outline-none">
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <SLabel>Compare To</SLabel>
          <select value={prior} onChange={(e) => onPrior(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none">
            <option value="">No comparison</option>
            {campaigns.filter((c) => c !== current).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function PerspRail({
  perspectives, activeId, onSelect,
}: {
  perspectives: { id: string; label: string }[]; activeId: string; onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-border-strong">
      <CardContent className="p-0">
        {perspectives.map((p) => (
          <button
            key={p.id} type="button" onClick={() => onSelect(p.id)}
            className={`flex w-full items-center justify-between border-b border-border-subtle px-4 py-3 text-left text-sm last:border-b-0 transition
              ${activeId === p.id ? "bg-nsp-blue-50 font-semibold text-nsp-blue-700" : "bg-white font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"}`}
          >
            {p.label}
            {activeId === p.id && <ChevronRight className="h-4 w-4 text-nsp-blue-400" />}
          </button>
        ))}
      </CardContent>
    </Card>
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
    <Card className="border-border-strong">
      <CardContent className="space-y-3 p-5">
        <SLabel>Filters</SLabel>
        {filters.map((f) => (
          <div key={f.id}>
            <span className="text-xs font-medium text-text-secondary">{f.label}</span>
            <select
              value={f.value} onChange={(e) => onChange(f.id, e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none"
            >
              <option value="">All</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {hasActive && (
          <button type="button" onClick={onReset} className="w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-2">
            Reset filters
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function SelectorRail({
  label, items, active, onSelect, scoreByItem,
}: {
  label: string; items: string[]; active: string;
  onSelect: (v: string) => void; scoreByItem?: Record<string, number>;
}) {
  return (
    <Card className="border-border-strong">
      <CardContent className="p-5">
        <SLabel>{label}</SLabel>
        <div className="mt-2 max-h-[380px] space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const score = scoreByItem?.[item];
            const isActive = item === active;
            return (
              <button
                key={item} type="button" onClick={() => onSelect(item)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition
                  ${isActive ? "bg-nsp-blue-50 font-semibold text-nsp-blue-700" : "font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary"}`}
              >
                <span className="min-w-0 flex-1 truncate">{item}</span>
                {score !== undefined && <ScoreChip score={score} size="sm" />}
              </button>
            );
          })}
          {items.length === 0 && <p className="py-3 text-center text-xs text-text-muted">No groups meet the minimum threshold.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Executive: Campaign Overview ─────────────────────────────────────────────

function ExecOverview({
  data, current, prior,
}: { data: EmployeeExperienceDashboardData; current: string; prior: string }) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const priR = useMemo(() => prior ? data.respondents.filter((r) => r.campaignLabel === prior) : [], [data.respondents, prior]);

  const orgScore = useMemo(() => groupScore(curR, allIds), [curR, allIds]);
  const orgPrior = useMemo(() => priR.length > 0 ? groupScore(priR, allIds) : null, [priR, allIds]);
  const orgDelta = orgPrior !== null ? r1(orgScore - orgPrior) : null;

  const dims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const sorted = useMemo(() => [...dims].sort((a, b) => b.score - a.score), [dims]);
  const best = sorted[0];
  const focus = sorted[sorted.length - 1];
  const mostImproved = [...dims].filter((d) => d.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];

  if (curR.length < min) return <Empty message="Insufficient responses for the selected campaign." />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-border-strong bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <SLabel>Campaign Overview · {data.meta.organizationName}</SLabel>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">{current}</h2>
              <p className="mt-2 text-sm text-text-secondary">
                {curR.length} total {curR.length === 1 ? "response" : "responses"} across all dimensions.
                {prior && orgDelta !== null && ` ${orgDelta > 0 ? "Up" : orgDelta < 0 ? "Down" : "Flat"} ${fmtDelta(orgDelta)} vs ${prior}.`}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreChip score={orgScore} size="lg" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Overall</span>
                <DeltaChip delta={orgDelta} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Index tiles */}
      <div>
        <SLabel>Index Scores</SLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dims.map((dim) => (
            <div key={dim.id} className="flex items-center justify-between rounded-2xl border border-border-strong bg-white px-4 py-4 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{dim.label}</p>
                <p className="mt-0.5 text-2xl font-extrabold text-text-primary">{formatScoreForDisplay(dim.score)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="h-9 w-9 rounded-xl" style={{ backgroundColor: sColor(dim.score) }} />
                <DeltaChip delta={dim.delta} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        {best && (
          <div className="rounded-2xl px-5 py-4 shadow-sm" style={{ backgroundColor: sColor(best.score), color: sTColor(best.score) }}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Strongest Index</p>
            <p className="mt-1 text-xl font-extrabold">{best.label}</p>
            <p className="text-2xl font-extrabold">{formatScoreForDisplay(best.score)}</p>
          </div>
        )}
        {focus && (
          <div className="rounded-2xl px-5 py-4 shadow-sm" style={{ backgroundColor: sColor(focus.score), color: sTColor(focus.score) }}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Area of Focus</p>
            <p className="mt-1 text-xl font-extrabold">{focus.label}</p>
            <p className="text-2xl font-extrabold">{formatScoreForDisplay(focus.score)}</p>
          </div>
        )}
        {mostImproved ? (
          <div className="rounded-2xl border border-border-strong bg-nsp-green-50 px-5 py-4 text-nsp-green-900 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Most Improved</p>
            <p className="mt-1 text-xl font-extrabold">{mostImproved.label}</p>
            <p className="text-2xl font-extrabold">{fmtDelta(mostImproved.delta)}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-strong bg-surface-2 px-5 py-4 text-text-muted shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider">Prior Campaign</p>
            <p className="mt-1 text-sm">{prior ? "No delta available." : "Select a comparison campaign."}</p>
          </div>
        )}
      </div>

      {/* Bar chart + radar */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Index Rankings</CardTitle>
            <CardDescription>All dimensions ranked by current campaign average.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <GradientBarChart
              data={sorted.map((d) => ({ name: d.label, value: d.score }))}
              average={orgScore}
              minValue={EE.min} midpoint={EE.mid} maxValue={EE.max}
              height={260}
            />
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Dimension Profile</CardTitle>
            <CardDescription>{prior ? `Current (solid) vs ${prior} (outline).` : "Current campaign shape across all dimensions."}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <NspRadarChart
              data={dims.map((d) => ({ dimension: d.label, value: d.score, benchmark: d.prevScore ?? d.score }))}
              maxValue={100} showBenchmark={!!prior} height={280}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Executive: Location Breakdown ───────────────────────────────────────────

function ExecLocation({
  data, current, prior,
}: { data: EmployeeExperienceDashboardData; current: string; prior: string }) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const priR = useMemo(() => prior ? data.respondents.filter((r) => r.campaignLabel === prior) : [], [data.respondents, prior]);

  const orgDims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const orgScore = useMemo(() => groupScore(curR, allIds), [curR, allIds]);
  const orgPrior = useMemo(() => priR.length > 0 ? groupScore(priR, allIds) : null, [priR, allIds]);

  function buildRows(field: keyof EmployeeExperienceRespondent): ScoreTableRow[] {
    return uniq(curR, field, min).map((val) => {
      const dc = curR.filter((r) => r[field] === val);
      const dp = priR.filter((r) => r[field] === val);
      const score = groupScore(dc, allIds);
      const prevScore = dp.length >= min ? groupScore(dp, allIds) : null;
      return {
        label: val, n: dc.length, score,
        delta: prevScore !== null ? r1(score - prevScore) : null,
        dims: buildDims(data.questions, dc, dp.length >= min ? dp : []),
      };
    }).sort((a, b) => b.score - a.score);
  }

  const locationRows = useMemo(() => buildRows("location"), [curR, priR, data.questions, min]);
  const workTypeRows = useMemo(() => buildRows("fieldCategory"), [curR, priR, data.questions, min]);

  const orgRow: ScoreTableRow = {
    label: "Overall", n: curR.length, score: orgScore,
    delta: orgPrior !== null ? r1(orgScore - orgPrior) : null,
    dims: orgDims,
  };

  if (curR.length < min) return <Empty message="Insufficient responses for the selected campaign." />;

  return (
    <div className="space-y-6">
      <PgHeader
        label="Executive · Location Breakdown"
        title="Scores by Region and Work Type"
        description="Index scores broken down by geography and field category. Color reflects score strength against the campaign average."
      />
      {locationRows.length > 0
        ? <CrossTabTable title="By Location" description="Score per index grouped by region." rows={locationRows} dims={orgDims} orgRow={orgRow} />
        : <Empty message="No locations meet the minimum response threshold." />}
      {workTypeRows.length > 0 && (
        <CrossTabTable title="By Work Type" description="Score per index grouped by field category (Field, Office, Shop, etc.)." rows={workTypeRows} dims={orgDims} orgRow={orgRow} />
      )}
    </div>
  );
}

// ─── HR: Department Rankings ──────────────────────────────────────────────────

function HrRankings({
  data, current, prior, filters, onFilterChange, onFilterReset, locationOpts, workTypeOpts,
}: {
  data: EmployeeExperienceDashboardData; current: string; prior: string;
  filters: Record<string, string>;
  onFilterChange: (id: string, v: string) => void; onFilterReset: () => void;
  locationOpts: string[]; workTypeOpts: string[];
}) {
  const min = data.settings.minimumSegmentSize;
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);
  const curR = useMemo(() => filterR(data.respondents.filter((r) => r.campaignLabel === current), filters), [data.respondents, current, filters]);
  const priR = useMemo(() => prior ? filterR(data.respondents.filter((r) => r.campaignLabel === prior), filters) : [], [data.respondents, prior, filters]);

  const orgDims = useMemo(() => buildDims(data.questions, curR, priR), [data.questions, curR, priR]);
  const depts = useMemo(() => uniq(curR, "department", min), [curR, min]);

  const rows: ScoreTableRow[] = useMemo(() =>
    depts.map((dept) => {
      const dc = curR.filter((r) => r.department === dept);
      const dp = priR.filter((r) => r.department === dept);
      const score = groupScore(dc, allIds);
      const prevScore = dp.length >= min ? groupScore(dp, allIds) : null;
      return {
        label: dept, n: dc.length, score,
        delta: prevScore !== null ? r1(score - prevScore) : null,
        dims: buildDims(data.questions, dc, dp.length >= min ? dp : []),
      };
    }).sort((a, b) => b.score - a.score),
    [depts, curR, priR, allIds, min, data.questions]
  );

  if (rows.length === 0) return <Empty message="No departments meet the minimum response threshold under the current filters." />;

  return (
    <div className="space-y-6">
      <PgHeader
        label="HR · Department Rankings"
        title={`${rows.length} Department${rows.length !== 1 ? "s" : ""} · ${current}`}
        description="All departments ranked by overall experience index. Use filters in the left rail to narrow by location or work type."
      />
      <Card className="border-border-strong">
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="py-3.5 pr-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">#</th>
                <th className="py-3.5 pr-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Department</th>
                <th className="px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">n</th>
                {orgDims.map((d) => (
                  <th key={d.id} className="px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{d.label}</th>
                ))}
                <th className="pl-3 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Total</th>
                <th className="px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-3 pr-2 text-text-muted">{i + 1}</td>
                  <td className="py-3 pr-4 font-semibold text-text-primary">{row.label}</td>
                  <td className="px-2 py-3 text-center text-text-muted">{row.n}</td>
                  {orgDims.map((d) => {
                    const rd = row.dims?.find((x) => x.label === d.label);
                    return (
                      <td key={d.id} className="px-2 py-3 text-center">
                        {rd ? <ScoreChip score={rd.score} size="sm" /> : <span className="text-text-muted">—</span>}
                      </td>
                    );
                  })}
                  <td className="pl-3 py-3 text-center"><ScoreChip score={row.score} size="sm" /></td>
                  <td className="px-2 py-3 text-center"><DeltaChip delta={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
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
      <PgHeader
        label={`HR · Index Deep Dive · ${selectedDim}`}
        title={`${selectedDim} — Statement Detail`}
        description="All survey items in this dimension ranked by score. Delta compares to the selected prior campaign."
      />

      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Statement Ranking</CardTitle>
          <CardDescription>Highest to lowest for the current campaign. Delta reflects change vs prior.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Statement</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">{current}</th>
                {prior && <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Δ</th>}
              </tr>
            </thead>
            <tbody>
              {stmts.map((q, i) => (
                <tr key={q.itemId} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-3 pr-4 text-[13px] leading-relaxed text-text-primary">{q.statement}</td>
                  <td className="px-3 py-3 text-center"><ScoreChip score={q.score} size="sm" /></td>
                  {prior && <td className="px-3 py-3 text-center"><DeltaChip delta={q.delta} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {deptBars.length > 0 && (
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>{selectedDim} by Department</CardTitle>
            <CardDescription>Which departments score highest and lowest on this index.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <GradientBarChart
              data={deptBars}
              average={dimAvg}
              minValue={EE.min} midpoint={EE.mid} maxValue={EE.max}
              height={Math.max(280, deptBars.length * 34)}
            />
          </CardContent>
        </Card>
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
        <SLabel>HR · Supervisor Reports</SLabel>
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
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Supervisor Item Table</CardTitle>
            <CardDescription>Team score vs. org average per item. Delta vs prior campaign.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-strong">
                  <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Statement</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Score</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Org Avg</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Δ</th>
                </tr>
              </thead>
              <tbody>
                {qRows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                    <td className="py-3 pr-3 text-[12px] leading-relaxed text-text-primary">{row.statement}</td>
                    <td className="px-2 py-3 text-center"><ScoreChip score={row.score} size="sm" /></td>
                    <td className="px-2 py-3 text-center font-semibold text-text-secondary">{formatScoreForDisplay(row.orgScore)}</td>
                    <td className="px-2 py-3 text-center"><DeltaChip delta={row.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Benchmark Comparison</CardTitle>
            <CardDescription>Bar = supervisor score. Orange dot = organization supervisor average.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <SupervisorBenchmark rows={qRows} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader><CardTitle>Strengths to Protect</CardTitle><CardDescription>Highest-scoring supervisor items.</CardDescription></CardHeader>
          <CardContent className="space-y-3 pt-0">
            {qRows.slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Strength · {formatScoreForDisplay(row.score)}</p>
                <p className="mt-1 text-sm leading-relaxed">{row.statement}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader><CardTitle>Manager Priorities</CardTitle><CardDescription>Lowest-scoring items to address.</CardDescription></CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[...qRows].sort((a, b) => a.score - b.score).slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: sColor(row.score), color: sTColor(row.score) }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Priority · {formatScoreForDisplay(row.score)}</p>
                <p className="mt-1 text-sm leading-relaxed">{row.statement}</p>
              </div>
            ))}
          </CardContent>
        </Card>
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
      <PgHeader
        label="HR · Open Text"
        title={fieldLabel}
        description={`${entries.length} response${entries.length !== 1 ? "s" : ""}${deptFilter ? ` from ${deptFilter}` : " across all departments"} · ${current}`}
      />
      {entries.length === 0 ? (
        <Empty message="No responses match the current selection." />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={entry.id} className="rounded-2xl border border-border-strong bg-white px-5 py-4">
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
      { id: "location", label: "Location" },
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
      <Card className="border-border-strong">
        <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader>
        <CardContent className="pt-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Statement</th>
                <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Score</th>
                <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Δ</th>
              </tr>
            </thead>
            <tbody>
              {stmts.map((q, i) => (
                <tr key={q.itemId} className={`border-b border-border-subtle ${i % 2 === 0 ? "bg-white" : "bg-surface-2/40"}`}>
                  <td className="py-2.5 pr-3 text-[12px] leading-relaxed text-text-primary">{q.statement}</td>
                  <td className="px-2 py-2.5 text-center"><ScoreChip score={q.score} size="sm" /></td>
                  <td className="px-2 py-2.5 text-center"><DeltaChip delta={q.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border-strong bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/30">
        <CardContent className="p-6">
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
        </CardContent>
      </Card>

      {/* Index tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dims.map((dim) => (
          <div key={dim.id} className="flex items-center justify-between rounded-2xl border border-border-strong bg-white px-4 py-4 shadow-sm">
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
              <Card key={cut.id} className="border-border-strong">
                <CardHeader><CardTitle className="text-base">{cut.label}</CardTitle></CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {cut.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{row.label} ({row.n})</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ScoreChip score={row.score} size="sm" />
                        <DeltaChip delta={row.delta} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DwsEmployeeExperienceDashboardClient({ data }: { data: EmployeeExperienceDashboardData }) {
  const [activeGroup, setActiveGroup] = useState<GroupId>("executive");
  const [activePersp, setActivePersp] = useState<PerspectiveId>("exec-overview");
  const [current, setCurrent] = useState(data.meta.currentCampaignLabel);
  const [prior, setPrior] = useState(data.meta.priorCampaignLabel ?? "");

  const [hrRankFilters, setHrRankFilters] = useState<Record<string, string>>({ location: "", fieldCategory: "" });
  const [selectedDim, setSelectedDim] = useState(DIM_ORDER.find((d) => data.questions.some((q) => q.dimension === d)) ?? "");
  const [idxFilters, setIdxFilters] = useState<Record<string, string>>({ location: "", fieldCategory: "" });
  const [supFilters, setSupFilters] = useState<Record<string, string>>({ location: "", department: "" });
  const [selectedSup, setSelectedSup] = useState("");
  const [openTextDept, setOpenTextDept] = useState("");
  const [openTextField, setOpenTextField] = useState<OpenTextField>("strengths");
  const [selectedDept, setSelectedDept] = useState("");

  const min = data.settings.minimumSegmentSize;
  const curR = useMemo(() => data.respondents.filter((r) => r.campaignLabel === current), [data.respondents, current]);
  const allIds = useMemo(() => data.questions.map((q) => q.itemId), [data.questions]);

  const locationOpts = useMemo(() => uniq(curR, "location", min), [curR, min]);
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

  function onGroupChange(gid: string) {
    const g = GROUPS.find((x) => x.id === gid) ?? GROUPS[0];
    setActiveGroup(g.id);
    setActivePersp(g.perspectives[0].id as PerspectiveId);
  }

  const leftRail = (
    <LRail>
      <CampaignRail campaigns={data.meta.campaigns} current={current} prior={prior} onCurrent={setCurrent} onPrior={setPrior} orgName={data.meta.organizationName} />
      <PerspRail perspectives={groupDef.perspectives.map((p) => ({ id: p.id, label: p.label }))} activeId={activePersp} onSelect={(id) => setActivePersp(id as PerspectiveId)} />

      {activePersp === "hr-rankings" && (
        <FilterRail
          filters={[
            { id: "location", label: "Location", value: hrRankFilters.location, options: locationOpts },
            { id: "fieldCategory", label: "Work Type", value: hrRankFilters.fieldCategory, options: workTypeOpts },
          ]}
          onChange={(id, v) => setHrRankFilters((f) => ({ ...f, [id]: v }))}
          onReset={() => setHrRankFilters({ location: "", fieldCategory: "" })}
        />
      )}

      {activePersp === "hr-index-dive" && (
        <>
          <Card className="border-border-strong">
            <CardContent className="p-4">
              <SLabel>Dimension</SLabel>
              <div className="mt-2 space-y-0.5">
                {DIM_ORDER.filter((d) => data.questions.some((q) => q.dimension === d)).map((d) => (
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
            </CardContent>
          </Card>
          <FilterRail
            filters={[
              { id: "location", label: "Location", value: idxFilters.location, options: locationOpts },
              { id: "fieldCategory", label: "Work Type", value: idxFilters.fieldCategory, options: workTypeOpts },
            ]}
            onChange={(id, v) => setIdxFilters((f) => ({ ...f, [id]: v }))}
            onReset={() => setIdxFilters({ location: "", fieldCategory: "" })}
          />
        </>
      )}

      {activePersp === "hr-supervisor" && (
        <>
          <FilterRail
            filters={[
              { id: "location", label: "Location", value: supFilters.location, options: locationOpts },
              { id: "department", label: "Department", value: supFilters.department, options: deptOpts },
            ]}
            onChange={(id, v) => setSupFilters((f) => ({ ...f, [id]: v }))}
            onReset={() => setSupFilters({ location: "", department: "" })}
          />
          <SelectorRail label="Supervisors" items={supOpts} active={selectedSup || supOpts[0] || ""} onSelect={setSelectedSup} scoreByItem={supScores} />
        </>
      )}

      {activePersp === "hr-open-text" && (
        <Card className="border-border-strong">
          <CardContent className="space-y-4 p-5">
            <div>
              <SLabel>Department</SLabel>
              <select value={openTextDept} onChange={(e) => setOpenTextDept(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-strong bg-white px-3 py-2 text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none">
                <option value="">All Departments</option>
                {deptOpts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <SLabel>Question Type</SLabel>
              <div className="mt-2 space-y-0.5">
                {OPEN_TEXT_FIELDS.map((f) => (
                  <button
                    key={f.id} type="button" onClick={() => setOpenTextField(f.id)}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition
                      ${openTextField === f.id ? "bg-nsp-blue-50 font-semibold text-nsp-blue-700" : "font-medium text-text-secondary hover:bg-surface-2"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activePersp === "dept-scorecard" && (
        <SelectorRail label="Departments" items={deptOpts} active={selectedDept || deptOpts[0] || ""} onSelect={setSelectedDept} scoreByItem={deptScores} />
      )}
    </LRail>
  );

  const content = useMemo(() => {
    switch (activePersp) {
      case "exec-overview": return <ExecOverview data={data} current={current} prior={prior} />;
      case "exec-location": return <ExecLocation data={data} current={current} prior={prior} />;
      case "hr-rankings":
        return (
          <HrRankings
            data={data} current={current} prior={prior}
            filters={hrRankFilters}
            onFilterChange={(id, v) => setHrRankFilters((f) => ({ ...f, [id]: v }))}
            onFilterReset={() => setHrRankFilters({ location: "", fieldCategory: "" })}
            locationOpts={locationOpts} workTypeOpts={workTypeOpts}
          />
        );
      case "hr-index-dive":
        return <HrIndexDive data={data} current={current} prior={prior} selectedDim={selectedDim} filters={idxFilters} />;
      case "hr-supervisor":
        return <HrSupervisor data={data} current={current} prior={prior} filters={supFilters} selectedSup={selectedSup || supOpts[0] || ""} onSelectSup={setSelectedSup} />;
      case "hr-open-text":
        return <HrOpenText data={data} current={current} deptFilter={openTextDept} fieldType={openTextField} />;
      case "dept-scorecard":
        return <DeptScorecard data={data} current={current} prior={prior} selectedDept={selectedDept || deptOpts[0] || ""} />;
      default: return null;
    }
  }, [activePersp, data, current, prior, hrRankFilters, selectedDim, idxFilters, supFilters, selectedSup, supOpts, openTextDept, openTextField, selectedDept, deptOpts, locationOpts, workTypeOpts]);

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
        legend={<ColorLegend minLabel={EE.minLabel} maxLabel={EE.maxLabel} />}
        toolbar={
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{data.meta.organizationName}</p>
            <p className="mt-1.5 max-w-4xl text-sm leading-relaxed text-text-secondary">
              Employee experience analytics organized by audience — Executive, HR, and Department — each offering a focused, actionable lens on the data.
            </p>
          </div>
        }
      />
      <DashboardCanvas leftRail={leftRail}>{content}</DashboardCanvas>
    </>
  );
}
