"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { ColorLegend } from "@/components/collaboration/color-legend";
import {
  gapScaleColor,
  scoreScaleColor,
  scoreScaleTextColor,
} from "@/components/collaboration/score-color-scale";
import { RelationshipMap } from "@/components/collaboration/relationship-map";
import { ScoreTable } from "@/components/collaboration/score-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import type { CollaborationData } from "@/types/collaboration";
import {
  DEMO_CI_QUESTIONS,
  type DemoFilters,
  type DemoGeneration,
  type DemoRespondent,
  type DemoRole,
  type DemoTenureBand,
} from "@/lib/collaboration/demo-data";
import {
  formatScoreDeltaForDisplay,
  formatScoreForDisplay,
} from "@/lib/collaboration/display-format";
import { getDataBoxSurfaceStyle } from "@/lib/collaboration/data-box-surface";
import type {
  ActionPriority,
  DepartmentSegmentSummary,
  DepartmentPriorityRow,
  ExecutiveKpi,
  PartnerQuestionHotspot,
  QuestionInsight,
  RelationshipInsight,
  SegmentSummary,
} from "@/lib/collaboration/demo-insights";

function ScoreChip({
  value,
  inverse,
}: {
  value: number;
  inverse?: boolean;
}) {
  const effectiveValue = inverse ? Math.max(3, Math.min(9, 9 - value)) : value;
  return (
    <span
      className="inline-flex min-w-[58px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: scoreScaleColor(effectiveValue, 3, 6, 9),
        color: scoreScaleTextColor(effectiveValue, 6, 0.65),
      }}
    >
      {formatScoreForDisplay(value)}
    </span>
  );
}

function normalizeScore(value: number, min = 3, max = 9) {
  const clamped = Math.max(min, Math.min(max, value));
  return `${Math.max(8, ((clamped - min) / (max - min)) * 100)}%`;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sortByNumericDesc<T>(rows: T[], accessor: (row: T) => number) {
  return [...rows].sort((left, right) => accessor(right) - accessor(left));
}

function shortQuestionLabel(question: string) {
  if (question.includes("communicate the information")) return "Communication";
  if (question.includes("informed and involved")) return "Decision Transparency";
  if (question.includes("priorities align")) return "Priority Alignment";
  if (question.includes("provide the support")) return "Cross-Team Support";
  if (question.includes("How proactive")) return "Proactive Communication";
  if (question.includes("work through it")) return "Conflict Recovery";
  if (question.includes("following through")) return "Follow-Through";
  if (question.includes("quality your team expects")) return "Delivery Quality";
  if (question.includes("operating rhythms")) return "Working Style Compatibility";
  return "Collaboration Quality";
}

function actionHint(question: string) {
  const label = shortQuestionLabel(question);
  if (label === "communication") return "Clarify what updates this group needs and when they need them.";
  if (label === "decision transparency") return "Bring them into decisions earlier and close the loop more visibly.";
  if (label === "priority alignment") return "Reconfirm shared priorities before work moves into execution.";
  if (label === "cross-team support") return "Tighten ownership around requests and handoffs.";
  if (label === "proactive communication") return "Increase pre-reads, proactive context, and next-step visibility.";
  if (label === "conflict recovery") return "Create a faster path for surfacing and resolving friction.";
  if (label === "follow-through") return "Use clearer commitments and follow-up checkpoints.";
  if (label === "delivery quality") return "Reset expectations around what good work looks like.";
  if (label === "working style compatibility") return "Adjust rhythms and meeting norms so coordination feels easier.";
  return "Use this as a practical coaching and operating-rhythm opportunity.";
}

function getComparisonMeta(
  score: number,
  benchmark: number,
  higherIsBetter = true
): {
  delta: number;
  direction: "up" | "down" | "flat";
  favorable: boolean;
  label: string;
} {
  const delta = score - benchmark;
  if (Math.abs(delta) < 0.05) {
    return {
      delta,
      direction: "flat",
      favorable: true,
      label: "In line with org average",
    };
  }

  const isPositive = delta > 0;
  const favorable = higherIsBetter ? isPositive : !isPositive;
  return {
    delta,
    direction: isPositive ? "up" : "down",
    favorable,
    label: `${formatScoreDeltaForDisplay(delta)} ${
      isPositive ? "above" : "below"
    } org average`,
  };
}

function getGapColorValue(gap: number) {
  return Math.max(3, Math.min(9, 9 - Math.min(gap, 6)));
}

function summarizeStanding(
  incoming: number,
  incomingBenchmark: number,
  ci: number,
  ciBenchmark: number,
  gap: number
) {
  if (incoming >= incomingBenchmark + 0.35 && ci >= ciBenchmark + 0.25) {
    return "is being experienced as a strong cross-functional partner";
  }

  if (incoming <= incomingBenchmark - 0.35 && ci <= ciBenchmark - 0.25) {
    return "is facing a clear relationship and collaboration drag";
  }

  if (gap >= 1.1) {
    return "is likely overestimating how consistently it is being experienced";
  }

  return "sits in the middle of the enterprise picture with a few visible opportunities";
}

interface InsightCard {
  id: string;
  title: string;
  headline: string;
  detail: string;
}

function buildLensInsightCard(
  respondents: DemoRespondent[],
  selectedDepartment: string,
  title: string,
  groupAccessor: (respondent: DemoRespondent) => string
): InsightCard | null {
  const eligibleRespondents = respondents.filter(
    (respondent) =>
      respondent.department !== selectedDepartment &&
      (respondent.ciScores[selectedDepartment]?.length ?? 0) > 0
  );

  if (eligibleRespondents.length < 2) return null;

  const overallBuckets = DEMO_CI_QUESTIONS.map(() => [] as number[]);
  const groupedBuckets = new Map<
    string,
    {
      respondentIds: Set<string>;
      questionBuckets: number[][];
    }
  >();

  for (const respondent of eligibleRespondents) {
    const label = groupAccessor(respondent);
    const scores = respondent.ciScores[selectedDepartment] ?? [];
    if (!groupedBuckets.has(label)) {
      groupedBuckets.set(label, {
        respondentIds: new Set<string>(),
        questionBuckets: DEMO_CI_QUESTIONS.map(() => [] as number[]),
      });
    }
    const bucket = groupedBuckets.get(label);
    if (!bucket) continue;
    bucket.respondentIds.add(respondent.id);
    scores.forEach((score, index) => {
      overallBuckets[index].push(score);
      bucket.questionBuckets[index].push(score);
    });
  }

  let strongestSignal:
    | {
        label: string;
        question: string;
        delta: number;
        overallAverage: number;
      }
    | undefined;

  groupedBuckets.forEach((bucket, label) => {
    if (bucket.respondentIds.size < 2) return;
    bucket.questionBuckets.forEach((scores, index) => {
      const overallAverage = average(overallBuckets[index]);
      const segmentAverage = average(scores);
      if (overallAverage <= 0 || segmentAverage <= 0) return;
      const delta = segmentAverage - overallAverage;
      if (!strongestSignal || delta < strongestSignal.delta) {
        strongestSignal = {
          label,
          question: DEMO_CI_QUESTIONS[index],
          delta,
          overallAverage,
        };
      }
    });
  });

  if (!strongestSignal) return null;

  const percentDifference = Math.max(
    1,
    Math.round((Math.abs(strongestSignal.delta) / strongestSignal.overallAverage) * 100)
  );
  const questionLabel = shortQuestionLabel(strongestSignal.question);

  return {
    id: `${title}-${strongestSignal.label}`,
    title,
    headline: `${strongestSignal.label} is seeing your department differently`,
    detail: `${strongestSignal.label} rated your department ${percentDifference}% ${
      strongestSignal.delta <= 0 ? "lower" : "higher"
    } than the overall benchmark on ${questionLabel}. ${actionHint(
      strongestSignal.question
    )}`,
  };
}

function PairComparisonBar({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          <span>{leftLabel}</span>
          <span>{formatScoreForDisplay(leftValue)}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-3">
          <div
            className="h-2 rounded-full"
            style={{
              width: normalizeScore(leftValue),
              backgroundColor: scoreScaleColor(leftValue, 3, 6, 9),
            }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          <span>{rightLabel}</span>
          <span>{formatScoreForDisplay(rightValue)}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-3">
          <div
            className="h-2 rounded-full"
            style={{
              width: normalizeScore(rightValue),
              backgroundColor: scoreScaleColor(rightValue, 3, 6, 9),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function GapMeter({
  value,
  label = "Perception gap",
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.min((Math.abs(value) / 8) * 100, 100);
  const severityValue = Math.max(3, Math.min(9, 9 - value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        <span>{label}</span>
        <span>{formatScoreDeltaForDisplay(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-3">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.max(percent, 6)}%`,
            backgroundColor: scoreScaleColor(severityValue, 3, 6, 9),
          }}
        />
      </div>
    </div>
  );
}

function ReportHero({
  eyebrow,
  title,
  summary,
  value,
  valueLabel,
  tone = "neutral",
  action,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  value: string;
  valueLabel: string;
  tone?: "neutral" | "warning" | "good";
  action?: string;
}) {
  const toneClass =
    tone === "warning"
      ? "from-nsp-orange-50 to-white"
      : tone === "good"
        ? "from-nsp-blue-50 to-white"
        : "from-white to-surface-2";

  return (
    <Card className={`overflow-hidden border-border-strong bg-gradient-to-br ${toneClass}`}>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            {summary}
          </p>
          {action && (
            <p className="mt-4 text-sm font-semibold text-text-primary">
              What to do next: <span className="font-normal text-text-secondary">{action}</span>
            </p>
          )}
        </div>
        <div
          className="rounded-2xl border border-border-strong bg-surface-3 px-5 py-5 shadow-sm"
          style={getDataBoxSurfaceStyle()}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            {valueLabel}
          </p>
          <p className="mt-2 text-5xl font-extrabold leading-none text-text-primary">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionLadder({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; detail: string }>;
}) {
  return (
    <Card className="border-border-strong">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item.title} className="flex gap-4 rounded-2xl bg-surface-2 px-4 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nsp-blue-500 text-sm font-bold text-white">
              {index + 1}
            </div>
            <div>
              <p className="font-semibold text-text-primary">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function KpiCard({
  kpi,
}: {
  kpi: ExecutiveKpi;
}) {
  const toneClass =
    kpi.tone === "good"
      ? "bg-nsp-blue-50"
      : kpi.tone === "warning"
        ? "bg-nsp-orange-50"
        : "bg-surface-2";

  return (
    <Card className={`border-border-strong ${toneClass}`} style={getDataBoxSurfaceStyle()}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-[0.2em] text-text-secondary">
          {kpi.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold text-text-primary">{kpi.value}</p>
        <p className="mt-2 text-sm text-text-secondary">{kpi.detail}</p>
      </CardContent>
    </Card>
  );
}

export function DepartmentSelector({
  departments,
  value,
  onChange,
  label = "Department",
  ariaLabel,
  className,
}: {
  departments: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Select
      label={label}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15 ${className ?? ""}`}
    >
      {departments.map((department) => (
        <option key={department} value={department}>
          {department}
        </option>
      ))}
    </Select>
  );
}

export function ReportSegmentFilters({
  filters,
  onChange,
  roles,
  generations,
  tenures,
  matchingRespondents,
}: {
  filters: DemoFilters;
  onChange: (next: DemoFilters) => void;
  roles: readonly DemoRole[];
  generations: readonly DemoGeneration[];
  tenures: readonly DemoTenureBand[];
  matchingRespondents: number;
}) {
  return (
    <Card className="border-border-strong bg-surface-2">
      <CardContent className="grid gap-3 p-3 lg:grid-cols-[180px_1fr_1fr_1fr] lg:items-end">
        <div
          className="rounded-2xl border border-border-strong bg-surface-3 px-4 py-2.5"
          style={getDataBoxSurfaceStyle()}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Matching Respondents
          </p>
          <p className="mt-1 text-2xl font-extrabold leading-none text-text-primary">
            {matchingRespondents}
          </p>
        </div>
        <Select
          label="Role Lens"
          value={filters.role}
          onChange={(event) =>
            onChange({ ...filters, role: event.target.value as DemoFilters["role"] })
          }
          className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
        >
          <option value="all">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
        <Select
          label="Generation Lens"
          value={filters.generation}
          onChange={(event) =>
            onChange({
              ...filters,
              generation: event.target.value as DemoFilters["generation"],
            })
          }
          className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
        >
          <option value="all">All generations</option>
          {generations.map((generation) => (
            <option key={generation} value={generation}>
              {generation}
            </option>
          ))}
        </Select>
        <Select
          label="Tenure Lens"
          value={filters.tenure}
          onChange={(event) =>
            onChange({
              ...filters,
              tenure: event.target.value as DemoFilters["tenure"],
            })
          }
          className="rounded-2xl border-border-strong focus:border-nsp-blue-300 focus:ring-nsp-blue-500/15"
        >
          <option value="all">All tenure bands</option>
          {tenures.map((tenure) => (
            <option key={tenure} value={tenure}>
              {tenure}
            </option>
          ))}
        </Select>
      </CardContent>
    </Card>
  );
}

export function ExecutiveSummaryTab({
  data,
  kpis,
  narrative,
  relationships,
}: {
  data: CollaborationData;
  kpis: ExecutiveKpi[];
  narrative: string[];
  relationships: RelationshipInsight[];
}) {
  const atRiskDepartments = data.departmentMetrics
    .filter((metric) => metric.incomingCDRS > 0)
    .map((metric) => ({
      id: metric.department,
      department: metric.department,
      incoming: metric.incomingCDRS,
      outgoing: metric.outgoingCDRS,
      ci: metric.collaborationIndex,
      gap: metric.outgoingCDRS - metric.incomingCDRS,
    }))
    .sort(
      (left, right) =>
        left.incoming -
        right.incoming -
        Math.abs(left.gap) * 0.01 +
        Math.abs(right.gap) * 0.01
    )
    .slice(0, 6);

  const relationshipRows = relationships
    .slice(0, 6)
    .map((relationship) => ({
      ...relationship,
      id: relationship.id,
    }));
  const highestRiskDepartment = atRiskDepartments[0];
  const biggestRiskRelationship = relationshipRows[0];

  return (
    <div className="space-y-6">
      <ReportHero
        eyebrow="Executive Mode"
        title={
          highestRiskDepartment
            ? `${highestRiskDepartment.department} needs enterprise attention`
            : "Enterprise collaboration summary"
        }
        summary={
          biggestRiskRelationship
            ? `${biggestRiskRelationship.departments} is the most fragile cross-functional seam right now. Pair that with ${highestRiskDepartment?.department ?? "the weakest department"} receiving the lowest incoming sentiment and leadership has a clear place to start.`
            : "Use this page to identify the parts of the operating model that need executive ownership first."
        }
        value={
          highestRiskDepartment
            ? formatScoreForDisplay(highestRiskDepartment.incoming)
            : "—"
        }
        valueLabel="Lowest incoming CDRS"
        tone="warning"
        action="Assign executive owners to the top seam and the lowest-trust department before those issues turn into execution drag."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <Card className="rounded-[24px] border-border-strong">
        <CardHeader>
          <CardTitle>Executive Readout</CardTitle>
          <CardDescription>
            Designed for executive ownership: where enterprise collaboration is
            creating risk, where trust is strongest, and where leadership should
            intervene first.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {narrative.map((line, index) => (
            <div key={line} className="rounded-2xl bg-surface-2 px-4 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Takeaway {index + 1}
              </p>
              <p className="text-sm leading-relaxed text-text-primary">{line}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Departments Needing Executive Attention</CardTitle>
            <CardDescription>
              Low incoming trust and large perception gaps typically require
              leadership ownership, not just local coaching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {atRiskDepartments.map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface-2 px-4 py-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{row.department}</p>
                    <p className="text-sm text-text-secondary">
                      CI {formatScoreForDisplay(row.ci)} with a{" "}
                      {formatScoreDeltaForDisplay(row.gap)} point perception gap
                    </p>
                  </div>
                  <Badge variant="destructive">Focus area</Badge>
                </div>
                <PairComparisonBar
                  leftLabel="Incoming"
                  leftValue={row.incoming}
                  rightLabel="Outgoing"
                  rightValue={row.outgoing}
                />
                <div className="mt-3">
                  <GapMeter value={row.gap} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Critical Relationship Watchlist</CardTitle>
            <CardDescription>
              Bilateral relationships with enterprise impact. Low mutual strength
              plus asymmetry often signals coordination failures at leadership
              seams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {relationshipRows.map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface-2 px-4 py-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{row.departments}</p>
                    <p className="text-sm text-text-secondary">
                      Mutual {formatScoreForDisplay(row.mutualScore)} across {row.volume}{" "}
                      signals
                    </p>
                  </div>
                  <Badge variant="destructive">Executive focus</Badge>
                </div>
                <PairComparisonBar
                  leftLabel={`${row.leftDepartment} → ${row.rightDepartment}`}
                  leftValue={row.leftToRight}
                  rightLabel={`${row.rightDepartment} → ${row.leftDepartment}`}
                  rightValue={row.rightToLeft}
                />
                <div className="mt-3">
                  <GapMeter value={row.perceptionGap} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CriticalRelationshipsTab({
  relationships,
}: {
  relationships: RelationshipInsight[];
}) {
  const riskRows = relationships.slice(0, 10);
  const protectRows = relationships
    .slice()
    .sort((left, right) => right.mutualScore - left.mutualScore)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <ReportHero
        eyebrow="Executive Mode"
        title={riskRows[0]?.departments ?? "Critical relationships"}
        summary="This page isolates the seams executives should watch most closely and the strongest partnerships worth protecting or replicating."
        value={riskRows[0]?.departments ?? "—"}
        valueLabel="Highest attention seam"
        tone="warning"
        action="Use the ordering tool in Demo Lab to surface the relationships leadership considers most vital."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border-strong bg-surface-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-nsp-red-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Highest attention seam
                </p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {riskRows[0]?.departments ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border-strong bg-surface-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-nsp-blue-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Strongest partnership
                </p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {protectRows[0]?.departments ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border-strong bg-surface-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-5 w-5 text-nsp-orange-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Largest perception gap
                </p>
                <p className="mt-1 text-lg font-bold text-text-primary">
                  {relationships
                    .slice()
                    .sort((left, right) => right.perceptionGap - left.perceptionGap)[0]
                    ?.departments ?? "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Executive Focus Relationships</CardTitle>
            <CardDescription>
              Executives should own these seams because the combination of low
              trust, asymmetry, and business volume can block enterprise
              execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskRows.map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface-2 px-4 py-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{row.departments}</p>
                    <p className="text-sm text-text-secondary">
                      Mutual {formatScoreForDisplay(row.mutualScore)} / CI{" "}
                      {formatScoreForDisplay(row.collaborationIndex)}
                    </p>
                  </div>
                  <Badge variant="destructive">Focus</Badge>
                </div>
                <PairComparisonBar
                  leftLabel={`${row.leftDepartment} → ${row.rightDepartment}`}
                  leftValue={row.leftToRight}
                  rightLabel={`${row.rightDepartment} → ${row.leftDepartment}`}
                  rightValue={row.rightToLeft}
                />
                <div className="mt-3">
                  <GapMeter value={row.perceptionGap} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Relationships To Protect</CardTitle>
            <CardDescription>
              Preserve and replicate these high-trust partnerships as proof
              points for the operating model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {protectRows.map((row) => (
              <div key={row.id} className="rounded-2xl bg-surface-2 px-4 py-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">{row.departments}</p>
                    <p className="text-sm text-text-secondary">
                      Mutual {formatScoreForDisplay(row.mutualScore)} / CI{" "}
                      {formatScoreForDisplay(row.collaborationIndex)}
                    </p>
                  </div>
                  <Badge variant="default">Protect</Badge>
                </div>
                <PairComparisonBar
                  leftLabel={`${row.leftDepartment} → ${row.rightDepartment}`}
                  leftValue={row.leftToRight}
                  rightLabel={`${row.rightDepartment} → ${row.leftDepartment}`}
                  rightValue={row.rightToLeft}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SegmentSignalsTab({
  roleSummary,
  generationSummary,
  tenureSummary,
}: {
  roleSummary: SegmentSummary[];
  generationSummary: SegmentSummary[];
  tenureSummary: SegmentSummary[];
}) {
  const sortedRoleSummary = sortByNumericDesc(roleSummary, (row) => row.outgoingCdrs);
  const sortedGenerationSummary = sortByNumericDesc(
    generationSummary,
    (row) => row.outgoingCdrs
  );
  const sortedTenureSummary = sortByNumericDesc(tenureSummary, (row) => row.outgoingCdrs);

  const columns = [
    { key: "label", header: "Segment" },
    {
      key: "respondents",
      header: "Respondents",
      render: (row: SegmentSummary) => (
        <span className="font-semibold text-text-primary">{row.respondents}</span>
      ),
    },
    {
      key: "outgoingCdrs",
      header: "CDRS",
      render: (row: SegmentSummary) => <ScoreChip value={row.outgoingCdrs} />,
    },
    {
      key: "ci",
      header: "Outgoing CI",
      render: (row: SegmentSummary) => (
        <ScoreChip value={row.outgoingCi} />
      ),
    },
    {
      key: "cdrsVsOrg",
      header: "CDRS vs Org",
      render: (row: SegmentSummary) => (
        <span
          className={`font-semibold ${
            row.cdrsVsOrg < -0.12 ? "text-nsp-red-500" : "text-text-secondary"
          }`}
        >
          {formatScoreForDisplay(row.cdrsVsOrg)}
        </span>
      ),
    },
    {
      key: "ciVsOrg",
      header: "CI vs Org",
      render: (row: SegmentSummary) => (
        <span
          className={`font-semibold ${
            row.ciVsOrg < -0.12 ? "text-nsp-red-500" : "text-text-secondary"
          }`}
        >
          {formatScoreForDisplay(row.ciVsOrg)}
        </span>
      ),
    },
    { key: "weakestRelationship", header: "Weakest Relationship" },
  ];

  return (
    <div className="space-y-6">
      <ReportHero
        eyebrow="Executive Mode"
        title={sortedRoleSummary[sortedRoleSummary.length - 1]?.label ?? "Segment signals"}
        summary="This view is intentionally outgoing-only. It shows whether specific employee populations are experiencing the rest of the organization differently, which makes it ideal for spotting where trust or collaboration quality is breaking for a cohort."
        value={
          sortedRoleSummary[sortedRoleSummary.length - 1]
            ? formatScoreForDisplay(
                sortedRoleSummary[sortedRoleSummary.length - 1].outgoingCdrs
              )
            : "—"
        }
        valueLabel="Lowest segment CDRS"
        tone="warning"
        action="Use the weakest segment as an early warning signal before the issue becomes enterprise-wide."
      />
      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Enterprise Segment Signals</CardTitle>
          <CardDescription>
            This view is intentionally outgoing-only. It shows how different employee
            segments experience the rest of the organization, which makes it ideal
            for spotting where trust or collaboration quality is breaking for a
            specific population.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Role Signal</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={sortedRoleSummary} />
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Generation Signal</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={sortedGenerationSummary} />
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Tenure Signal</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={sortedTenureSummary} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DemoCdrsReportTab({
  data,
  filters,
  onFiltersChange,
  roles,
  generations,
  tenures,
  matchingRespondents,
}: {
  data: CollaborationData;
  filters: DemoFilters;
  onFiltersChange: (next: DemoFilters) => void;
  roles: readonly DemoRole[];
  generations: readonly DemoGeneration[];
  tenures: readonly DemoTenureBand[];
  matchingRespondents: number;
}) {
  const incomingData = data.departmentMetrics
    .filter((metric) => metric.incomingCount >= 2 && metric.incomingCDRS > 0)
    .slice()
    .sort((left, right) => right.incomingCDRS - left.incomingCDRS)
    .map((metric) => ({ name: metric.department, value: metric.incomingCDRS }));
  const outgoingData = data.departmentMetrics
    .filter((metric) => metric.outgoingCount >= 2 && metric.outgoingCDRS > 0)
    .slice()
    .sort((left, right) => right.outgoingCDRS - left.outgoingCDRS)
    .map((metric) => ({ label: metric.department, score: metric.outgoingCDRS }));
  const weakestIncoming = incomingData[incomingData.length - 1];

  return (
    <div className="space-y-6">
      <ReportSegmentFilters
        filters={filters}
        onChange={onFiltersChange}
        roles={roles}
        generations={generations}
        tenures={tenures}
        matchingRespondents={matchingRespondents}
      />

      {matchingRespondents < 2 ? (
        <Card className="border-border-strong">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-bold text-text-primary">Not enough respondents</p>
            <p className="mt-2 text-sm text-text-secondary">
              This report only displays data when at least two respondents match the
              active role, generation, and tenure criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ReportHero
            eyebrow="Department Mode"
            title={weakestIncoming ? `${weakestIncoming.name} is weakest under this lens` : "Segmented CDRS view"}
            summary="This report shows departmental CDRS through the eyes of the selected employee segment so you can see which groups perceive the organization most differently."
            value={weakestIncoming ? formatScoreForDisplay(weakestIncoming.value) : "—"}
            valueLabel="Lowest incoming CDRS"
            tone="warning"
            action="Use the gap between incoming and outgoing to decide whether the issue is local friction, enterprise drag, or a perception blind spot."
          />
          <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-3">
              <Card className="h-full border-border-strong">
                <CardContent className="space-y-4 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                    How to read this
                  </p>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    Incoming CDRS reflects how the active segment rates each department.
                    Outgoing CDRS reflects how each department in the active segment rates
                    the rest of the organization.
                  </p>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    This is the clearest way to see whether newer employees, managers,
                    or executives are experiencing the enterprise differently.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-5">
              <Card className="h-full border-border-strong">
                <CardHeader>
                  <CardTitle>Incoming CDRS</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                <GradientBarChart data={incomingData} average={data.meta.dwsAverageIncoming} />
                <p className="mt-2 text-center text-xs text-text-muted">
                  Average: {formatScoreForDisplay(data.meta.dwsAverageIncoming)}
                </p>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-4">
              <ScoreTable
                title="Outgoing CDRS"
                headers={["Dept", "Score"]}
                rows={outgoingData}
                className="h-full"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DemoCiReportTab({
  data,
  filters,
  onFiltersChange,
  roles,
  generations,
  tenures,
  matchingRespondents,
}: {
  data: CollaborationData;
  filters: DemoFilters;
  onFiltersChange: (next: DemoFilters) => void;
  roles: readonly DemoRole[];
  generations: readonly DemoGeneration[];
  tenures: readonly DemoTenureBand[];
  matchingRespondents: number;
}) {
  const ciData = data.departmentMetrics
    .filter((metric) => metric.ciCount >= 2 && metric.collaborationIndex > 0)
    .slice()
    .sort((left, right) => right.collaborationIndex - left.collaborationIndex)
    .map((metric) => ({ name: metric.department, value: metric.collaborationIndex }));
  const ciAverage =
    ciData.length > 0
      ? ciData.reduce((sum, item) => sum + item.value, 0) / ciData.length
      : 0;
  const questionRows = data.meta.ciQuestions
    .map((question, index) => {
      const values = data.departmentMetrics
        .map((metric) => metric.questionScores[index])
        .filter((score) => (score?.responseCount ?? 0) >= 2 && (score?.score ?? 0) > 0);
      const average =
        values.length > 0
          ? values.reduce((sum, value) => sum + value.score, 0) / values.length
          : 0;
      return { label: question, score: Number(average.toFixed(2)) };
    })
    .filter((row) => row.score > 0);
  const weakestCiDepartment = ciData[ciData.length - 1];
  const weakestQuestion = questionRows[questionRows.length - 1];

  const departments = data.departmentMetrics
    .filter((metric) => metric.ciCount >= 2)
    .map((metric) => metric.department);
  const ciHeatmapMatrix = data.departmentMetrics
    .filter((metric) => metric.ciCount >= 2)
    .map((metric) => ({
      department: metric.department,
      scores: Object.fromEntries(
        data.meta.ciQuestions.map((question, index) => [
          question,
          (metric.questionScores[index]?.responseCount ?? 0) >= 2
            ? metric.questionScores[index]?.score ?? null
            : null,
        ])
      ),
    }));
  const rowTotals = Object.fromEntries(
    data.departmentMetrics
      .filter((metric) => metric.ciCount >= 2)
      .map((metric) => [metric.department, metric.collaborationIndex])
  );
  const columnTotals = Object.fromEntries(
    data.meta.ciQuestions.map((question, index) => {
      const eligible = data.departmentMetrics
        .map((metric) => metric.questionScores[index])
        .filter((score) => (score?.responseCount ?? 0) >= 2 && (score?.score ?? 0) > 0);
      const average =
        eligible.length > 0
          ? eligible.reduce((sum, value) => sum + value.score, 0) / eligible.length
          : 0;
      return [question, average];
    })
  );

  return (
    <div className="space-y-6">
      <ReportSegmentFilters
        filters={filters}
        onChange={onFiltersChange}
        roles={roles}
        generations={generations}
        tenures={tenures}
        matchingRespondents={matchingRespondents}
      />

      {matchingRespondents < 2 ? (
        <Card className="border-border-strong">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-bold text-text-primary">Not enough respondents</p>
            <p className="mt-2 text-sm text-text-secondary">
              This report only displays data when at least two respondents match the
              active role, generation, and tenure criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ReportHero
            eyebrow="Department Mode"
            title={weakestCiDepartment ? `${weakestCiDepartment.name} has the lowest CI` : "Segmented collaboration index"}
            summary="This report shows outgoing collaboration quality through the eyes of the selected employee segment so you can isolate where communication, coordination, or follow-through are breaking down."
            value={weakestQuestion ? formatScoreForDisplay(weakestQuestion.score) : "—"}
            valueLabel="Weakest CI statement"
            tone="warning"
            action="Start with the weakest statement before trying to improve the overall index."
          />
          <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-3">
              <Card className="h-full border-border-strong">
                <CardContent className="space-y-4 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                    How to read this
                  </p>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    Because collaboration index is perception-based, this tab is best for
                    uncovering which groups are experiencing coordination, communication,
                    and follow-through differently.
                  </p>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    The heatmap at the bottom highlights which dimensions are weakest by
                    department under the active segment lens.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-5">
              <Card className="h-full border-border-strong">
                <CardHeader>
                  <CardTitle>Departmental Collaboration Index</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                <GradientBarChart
                  data={ciData}
                  average={ciAverage}
                  minValue={3}
                  midpoint={6}
                  maxValue={9}
                />
                <p className="mt-2 text-center text-xs text-text-muted">
                  Average: {formatScoreForDisplay(ciAverage)}
                </p>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-4">
              <ScoreTable
                title="CI Statements"
                headers={["Statement", "Collab Index"]}
                rows={questionRows}
                showIndicator
                minValue={3}
                midpoint={6}
                maxValue={9}
                className="h-full"
              />
            </div>
          </div>

          <Card className="border-border-strong">
            <CardHeader>
              <CardTitle>Collaboration Index Heatmap</CardTitle>
              <CardDescription>
                Each row shows a department&apos;s average score on each CI statement for the
                selected employee segment.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <HeatmapChart
                rows={departments}
                columns={data.meta.ciQuestions}
                data={ciHeatmapMatrix}
                rowTotals={rowTotals}
                columnTotals={columnTotals}
                minValue={3}
                midpoint={6}
                maxValue={9}
              />
              <ColorLegend className="mt-4 justify-center" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export function DepartmentCdrsReportTab({
  data,
  selectedDepartment,
  roleRows,
  generationRows,
  tenureRows,
}: {
  data: CollaborationData;
  selectedDepartment: string;
  roleRows: DepartmentSegmentSummary[];
  generationRows: DepartmentSegmentSummary[];
  tenureRows: DepartmentSegmentSummary[];
}) {
  const detail = data.departmentDetails.find(
    (department) => department.department === selectedDepartment
  );

  if (!detail) return null;

  const incomingBars = detail.incomingByDept
    .slice()
    .sort((left, right) => right.score - left.score)
    .map((row) => ({ name: row.department, value: row.score }));
  const outgoingRows = detail.outgoingByDept.map((row) => ({
    label: row.department,
    score: row.score,
  }));
  const averageGap = Math.abs(detail.outgoingCDRS - detail.incomingCDRS);
  const orgAverageGap =
    data.departmentDetails.length > 0
      ? data.departmentDetails.reduce(
          (sum, department) =>
            sum + Math.abs(department.outgoingCDRS - department.incomingCDRS),
          0
        ) / data.departmentDetails.length
      : 0;

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardContent className="flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4 xl:max-w-2xl">
            <CardTitle className="text-4xl font-extrabold tracking-tight text-text-primary">
              CDRS Report
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-relaxed text-text-secondary">
              Shows how{" "}
              <span className="font-semibold text-text-primary">
                {selectedDepartment}
              </span>{" "}
              is experienced by other groups, how it experiences them in return,
              and where the biggest relationship gaps deserve attention.
            </CardDescription>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex-1 xl:grid-cols-4">
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-3 px-4 py-4 text-center"
              style={getDataBoxSurfaceStyle()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-primary">
                Responses
              </p>
              <p className="mt-2 text-3xl font-extrabold text-text-primary">
                {detail.responseCount}
              </p>
            </div>
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-3 px-4 py-4 text-center"
              style={getDataBoxSurfaceStyle()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-primary">
                Incoming CDRS
              </p>
              <p
                className="mt-2 text-3xl font-extrabold text-text-primary"
              >
                {formatScoreForDisplay(detail.incomingCDRS)}
              </p>
              <p className="mt-2 text-xs italic text-text-secondary">
                Org: {formatScoreForDisplay(data.meta.dwsAverageIncoming)}
              </p>
            </div>
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-3 px-4 py-4 text-center"
              style={getDataBoxSurfaceStyle()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-primary">
                Outgoing CDRS
              </p>
              <p
                className="mt-2 text-3xl font-extrabold text-text-primary"
              >
                {formatScoreForDisplay(detail.outgoingCDRS)}
              </p>
              <p className="mt-2 text-xs italic text-text-secondary">
                Org: {formatScoreForDisplay(data.meta.dwsAverageOutgoing)}
              </p>
            </div>
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-3 px-4 py-4 text-center"
              style={getDataBoxSurfaceStyle()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-primary">
                Average Gap
              </p>
              <p
                className="mt-2 text-3xl font-extrabold text-text-primary"
              >
                {formatScoreForDisplay(averageGap)}
              </p>
              <p className="mt-2 text-xs italic text-text-secondary">
                Org: {formatScoreForDisplay(orgAverageGap)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RelationshipMap
        selectedDepartment={selectedDepartment}
        incomingByDept={detail.incomingByDept}
        outgoingByDept={detail.outgoingByDept}
        incomingCDRS={detail.incomingCDRS}
        outgoingCDRS={detail.outgoingCDRS}
        averageGap={averageGap}
        roleRows={roleRows}
        generationRows={generationRows}
        tenureRows={tenureRows}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Incoming CDRS</CardTitle>
            <CardDescription>
              How other departments experience {selectedDepartment}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <GradientBarChart
              data={incomingBars}
              average={detail.incomingCDRS}
              minValue={3}
              midpoint={6}
              maxValue={9}
            />
            <p className="mt-3 text-center text-xs text-text-muted">
              Department average: {formatScoreForDisplay(detail.incomingCDRS)}
            </p>
          </CardContent>
        </Card>
        <ScoreTable
          title="Outgoing CDRS"
          headers={["Department", "Score"]}
          rows={outgoingRows}
          className="h-full"
        />
      </div>
    </div>
  );
}

export function DepartmentCiReportTab({
  data,
  selectedDepartment,
}: {
  data: CollaborationData;
  selectedDepartment: string;
}) {
  const detail = data.departmentDetails.find(
    (department) => department.department === selectedDepartment
  );

  if (!detail) return null;

  const statementRows = detail.questionScores.map((question) => ({
    label: question.question,
    score: question.score,
  }));
  const statementChartRows = detail.questionScores
    .slice()
    .sort((left, right) => right.score - left.score)
    .map((question) => ({
      name: shortQuestionLabel(question.question),
      value: question.score,
    }));
  const strongestStatement = detail.questionScores
    .slice()
    .sort((left, right) => right.score - left.score)[0];
  const weakestStatement = detail.questionScores
    .slice()
    .sort((left, right) => left.score - right.score)[0];

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>CI Report</CardTitle>
          <CardDescription>
            Collaboration Index detail for {selectedDepartment}, including the
            strongest and weakest experience dimensions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-3">
          <div
            className="rounded-2xl border border-border-strong bg-surface-3 px-5 py-4"
            style={getDataBoxSurfaceStyle()}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Collaboration Index
            </p>
            <p className="mt-1 text-3xl font-extrabold text-text-primary">
              {formatScoreForDisplay(detail.collaborationIndex)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-strong bg-surface-2 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Strongest Statement
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {strongestStatement?.question ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border-strong bg-surface-2 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Weakest Statement
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {weakestStatement?.question ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Statement Scores</CardTitle>
            <CardDescription>
              Highest scoring CI statements appear first so the strongest and weakest
              dimensions are easy to compare.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <GradientBarChart
              data={statementChartRows}
              average={detail.collaborationIndex}
              minValue={3}
              midpoint={6}
              maxValue={9}
            />
          </CardContent>
        </Card>
        <ScoreTable
          title="Collaboration Index Statements"
          headers={["Statement", "Score"]}
          rows={statementRows}
          showIndicator
          minValue={3}
          midpoint={6}
          maxValue={9}
          className="h-full"
        />
      </div>
    </div>
  );
}

function StoryStatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-4 text-right backdrop-blur-sm">
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold leading-snug text-text-primary">{value}</p>
    </div>
  );
}

function DepartmentBenchmarkCard({
  label,
  value,
  benchmark,
  summary,
  higherIsBetter = true,
  colorValue = value,
}: {
  label: string;
  value: number;
  benchmark: number;
  summary: string;
  higherIsBetter?: boolean;
  colorValue?: number;
}) {
  const comparison = getComparisonMeta(value, benchmark, higherIsBetter);
  const Icon =
    comparison.direction === "up"
      ? ArrowUpRight
      : comparison.direction === "down"
        ? ArrowDownRight
        : Minus;
  const comparisonColor =
    comparison.direction === "flat"
      ? "text-text-secondary"
      : comparison.favorable
        ? "text-emerald-600"
        : "text-nsp-red-500";

  return (
    <Card className="border-border-strong">
      <CardContent className="space-y-4 p-5">
        <div
          className="h-1.5 rounded-full"
          style={{ backgroundColor: scoreScaleColor(colorValue, 3, 6, 9) }}
        />
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {label}
          </p>
          <p className="text-3xl font-extrabold text-text-primary">
            {formatScoreForDisplay(value)}
          </p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${comparisonColor}`}>
          <Icon className="h-4 w-4" />
          <span>{comparison.label}</span>
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{summary}</p>
      </CardContent>
    </Card>
  );
}

export function Department360Tab({
  data,
  selectedDepartment,
  rows,
  questionInsights,
  respondents,
}: {
  data: CollaborationData;
  selectedDepartment: string;
  rows: DepartmentPriorityRow[];
  questionInsights: QuestionInsight[];
  respondents: DemoRespondent[];
}) {
  const detail = data.departmentDetails.find(
    (department) => department.department === selectedDepartment
  );
  if (!detail) return null;

  const strongestPartner = [...rows].sort((left, right) => right.mutual - left.mutual)[0];
  const highestAttentionPartner = rows[0];
  const weakestQuestion = questionInsights[0];
  const strongestQuestion = [...questionInsights].sort((left, right) => right.score - left.score)[0];
  const ciAverage = average(
    data.departmentMetrics
      .map((metric) => metric.collaborationIndex)
      .filter((score) => score > 0)
  );
  const gap = Math.abs(detail.outgoingCDRS - detail.incomingCDRS);
  const orgGapAverage = average(
    data.departmentMetrics
      .map((metric) => Math.abs(metric.outgoingCDRS - metric.incomingCDRS))
      .filter((value) => value > 0)
  );
  const insightCards = [
    buildLensInsightCard(
      respondents,
      selectedDepartment,
      "Department lens",
      (respondent) => respondent.department
    ),
    buildLensInsightCard(
      respondents,
      selectedDepartment,
      "Role lens",
      (respondent) => respondent.role
    ),
    buildLensInsightCard(
      respondents,
      selectedDepartment,
      "Generation lens",
      (respondent) => respondent.generation
    ),
    buildLensInsightCard(
      respondents,
      selectedDepartment,
      "Tenure lens",
      (respondent) => respondent.tenure
    ),
  ].filter((card): card is InsightCard => Boolean(card));
  const storyLead = `${selectedDepartment} ${summarizeStanding(
    detail.incomingCDRS,
    data.meta.dwsAverageIncoming,
    detail.collaborationIndex,
    ciAverage,
    gap
  )}.`;
  const storySupport = `${
    highestAttentionPartner
      ? `${highestAttentionPartner.partner} is the clearest relationship to watch next`
      : "No single partner stands out yet"
  }, while ${
    strongestPartner
      ? `${strongestPartner.partner} is the strongest proof point to protect`
      : "there is not yet a strong relationship anchor"
  }. ${
    weakestQuestion
      ? `The sharpest collaboration signal is ${shortQuestionLabel(
          weakestQuestion.question
        )}, where the department is scoring ${formatScoreForDisplay(weakestQuestion.score)}.`
      : "There is not yet a strong CI signal to call out."
  }`;
  const rawStory = `${storyLead} ${storySupport}`;
  const filler =
    " Leaders can use these signals to prioritize where to invest in relationship clarity and collaboration quality across the enterprise. This helps leaders decide where to protect, repair, and learn next.";
  const padded = rawStory.length < 250 ? rawStory + filler : rawStory;
  const departmentStory =
    padded.length > 350
      ? padded.slice(0, 347).replace(/\s+\S*$/, "") + "..."
      : padded;

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardHeader className="pb-4">
          <CardTitle>Dept 360</CardTitle>
          <CardDescription>
            A narrative-first summary of how {selectedDepartment} is being experienced,
            where the department stands versus the organization, and where leaders
            should focus first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="rounded-2xl border border-border-strong bg-gradient-to-br from-surface-2 via-white to-nsp-blue-50/40 px-6 py-6">
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-nsp-orange-500">
                  Department Story
                </p>
                <p className="mt-3 max-w-4xl text-2xl font-normal leading-snug text-text-primary">
                  {departmentStory}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <StoryStatPill
                  label="Strongest relationship"
                  value={strongestPartner?.partner ?? "No clear strength yet"}
                />
                <StoryStatPill
                  label="Main opportunity"
                  value={
                    weakestQuestion
                      ? shortQuestionLabel(weakestQuestion.question)
                      : "No clear signal yet"
                  }
                />
                <StoryStatPill
                  label="Biggest watchout"
                  value={highestAttentionPartner?.partner ?? "No clear watchout yet"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DepartmentBenchmarkCard
              label="Incoming CDRS"
              value={detail.incomingCDRS}
              benchmark={data.meta.dwsAverageIncoming}
              summary="How other departments currently experience this team."
            />
            <DepartmentBenchmarkCard
              label="Outgoing CDRS"
              value={detail.outgoingCDRS}
              benchmark={data.meta.dwsAverageOutgoing}
              summary="How this team experiences the rest of the organization."
            />
            <DepartmentBenchmarkCard
              label="CDRS Gap"
              value={gap}
              benchmark={orgGapAverage}
              higherIsBetter={false}
              colorValue={getGapColorValue(gap)}
              summary="A wider gap often means the team is experiencing the relationship differently than peers are."
            />
            <DepartmentBenchmarkCard
              label="Collaboration Index"
              value={detail.collaborationIndex}
              benchmark={ciAverage}
              summary="How communication, coordination, and follow-through feel in practice."
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-4">
        {insightCards.map((card) => (
          <Card key={card.id} className="border-border-strong">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div
                className="mb-4 h-1.5 rounded-full"
                style={{
                  backgroundColor: scoreScaleColor(
                    card.title === "Department lens"
                      ? detail.incomingCDRS
                      : card.title === "Role lens"
                        ? detail.outgoingCDRS
                        : detail.collaborationIndex,
                    3,
                    6,
                    9
                  ),
                }}
              />
              <p className="text-sm font-semibold leading-relaxed text-text-primary">
                {card.headline}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {card.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Strengths To Reinforce</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-surface-2 px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">
                {strongestPartner?.partner ?? "No clear partner yet"} is the strongest
                two-way relationship.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Mutual relational strength is{" "}
                {strongestPartner ? formatScoreForDisplay(strongestPartner.mutual) : "—"}.
                Use this relationship as the example of how {selectedDepartment} can
                operate with credibility and clarity across the enterprise.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">
                {shortQuestionLabel(strongestQuestion?.question ?? "")} is landing best.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                This dimension is scoring{" "}
                {strongestQuestion ? formatScoreForDisplay(strongestQuestion.score) : "—"}{" "}
                and
                gives leaders a practical proof point to preserve while improvement work
                begins elsewhere.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Where To Focus Next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-surface-2 px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">
                {highestAttentionPartner?.partner ?? "No partner"} deserves near-term
                management attention.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Incoming is{" "}
                {highestAttentionPartner
                  ? formatScoreForDisplay(highestAttentionPartner.incoming)
                  : "—"}{" "}
                while outgoing is{" "}
                {highestAttentionPartner
                  ? formatScoreForDisplay(highestAttentionPartner.outgoing)
                  : "—"}
                , which
                suggests a meaningful perception mismatch. Start with clearer
                expectations, ownership, and operating rhythm between these teams.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">
                {shortQuestionLabel(weakestQuestion?.question ?? "")} is the clearest
                experience opportunity.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                This incoming CI dimension is scoring{" "}
                {weakestQuestion ? formatScoreForDisplay(weakestQuestion.score) : "—"}.
                {weakestQuestion ? ` ${actionHint(weakestQuestion.question)}` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function RelationshipGapsTab({
  data,
  selectedDepartment,
  onDepartmentChange,
  rows,
}: {
  data: CollaborationData;
  selectedDepartment: string;
  onDepartmentChange: (value: string) => void;
  rows: DepartmentPriorityRow[];
}) {
  return (
    <div className="space-y-6">
      <ReportHero
        eyebrow="Department Mode"
        title={`${selectedDepartment} perception gaps`}
        summary="This report makes asymmetry unmistakable. It shows where the department is experiencing a relationship very differently from how the partner experiences them in return."
        value={rows[0] ? formatScoreDeltaForDisplay(rows[0].perceptionGap) : "—"}
        valueLabel="Largest gap"
        tone="warning"
        action="Large gaps usually mean unspoken friction, broken assumptions, or leadership blind spots."
      />
      <Card className="border-border-strong">
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <CardTitle>Relationship Gaps</CardTitle>
              <CardDescription>
                Makes incoming and outgoing partnership asymmetry obvious so managers
                can see where their team is overestimating or underestimating a
                relationship.
              </CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <DepartmentSelector
                departments={data.meta.departments}
                value={selectedDepartment}
                onChange={onDepartmentChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-surface-2 px-4 py-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">{row.partner}</p>
                  <p className="text-sm text-text-secondary">
                    Mutual {formatScoreForDisplay(row.mutual)} / Focused follow-up recommended
                  </p>
                </div>
                <Badge variant={Math.abs(row.perceptionGap) >= 2 ? "destructive" : "warning"}>
                  Gap {formatScoreDeltaForDisplay(row.perceptionGap)}
                </Badge>
              </div>
              <PairComparisonBar
                leftLabel="Incoming"
                leftValue={row.incoming}
                rightLabel="Outgoing"
                rightValue={row.outgoing}
              />
              <div className="mt-3">
                <GapMeter value={row.perceptionGap} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DepartmentSegmentLensTab({
  selectedDepartment,
  roleRows,
  generationRows,
  tenureRows,
}: {
  selectedDepartment: string;
  roleRows: Array<{ id: string; label: string; respondents: number; outgoingCdrs: number; ci: number }>;
  generationRows: Array<{ id: string; label: string; respondents: number; outgoingCdrs: number; ci: number }>;
  tenureRows: Array<{ id: string; label: string; respondents: number; outgoingCdrs: number; ci: number }>;
}) {
  const sortedRoleRows = sortByNumericDesc(roleRows, (row) => row.outgoingCdrs);
  const sortedGenerationRows = sortByNumericDesc(generationRows, (row) => row.outgoingCdrs);
  const sortedTenureRows = sortByNumericDesc(tenureRows, (row) => row.outgoingCdrs);

  const columns = [
    { key: "label", header: "Segment" },
    {
      key: "respondents",
      header: "Respondents",
      render: (row: (typeof roleRows)[number]) => (
        <span className="font-semibold text-text-primary">{row.respondents}</span>
      ),
    },
    {
      key: "outgoingCdrs",
      header: "CDRS",
      render: (row: (typeof roleRows)[number]) => (
        <ScoreChip value={row.outgoingCdrs} />
      ),
    },
    {
      key: "ci",
      header: "CI",
      render: (row: (typeof roleRows)[number]) => (
        <span className="font-semibold text-text-primary">
          {formatScoreForDisplay(row.ci)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Department Segment Lens</CardTitle>
          <CardDescription>
            Shows which employee populations inside {selectedDepartment} are most
            positive or most frustrated, so managers can tailor responses to the right
            groups.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Role Lens</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={sortedRoleRows} />
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Generation Lens</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={sortedGenerationRows} />
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Tenure Lens</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={sortedTenureRows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CiHotspotsTab({
  selectedDepartment,
  questionInsights,
  partnerHotspots,
}: {
  selectedDepartment: string;
  questionInsights: QuestionInsight[];
  partnerHotspots: PartnerQuestionHotspot[];
}) {
  const sortedQuestionInsights = sortByNumericDesc(questionInsights, (row) => row.score);
  const sortedPartnerHotspots = sortByNumericDesc(partnerHotspots, (row) => row.score);
  const questionColumns = [
    { key: "question", header: "Question Dimension" },
    {
      key: "score",
      header: "Score",
      render: (row: QuestionInsight) => <ScoreChip value={row.score} />,
    },
    {
      key: "responseCount",
      header: "Responses",
      render: (row: QuestionInsight) => (
        <span className="font-semibold text-text-primary">{row.responseCount}</span>
      ),
    },
  ];
  const partnerColumns = [
    { key: "partner", header: "Partner" },
    { key: "weakestQuestion", header: "Weakest Dimension" },
    {
      key: "score",
      header: "Score",
      render: (row: PartnerQuestionHotspot) => <ScoreChip value={row.score} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>CI Hotspots</CardTitle>
          <CardDescription>
            Moves beyond a single score and surfaces the experience dimensions that are
            actually degrading {selectedDepartment}&apos;s relationships.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Incoming Experience Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={questionColumns} data={sortedQuestionInsights} />
          </CardContent>
        </Card>
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Partner-Specific Dimension Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={partnerColumns} data={sortedPartnerHotspots} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ActionPrioritiesTab({
  selectedDepartment,
  priorities,
  rows,
}: {
  selectedDepartment: string;
  priorities: ActionPriority[];
  rows: DepartmentPriorityRow[];
}) {
  const protectionRows = rows
    .slice()
    .sort((left, right) => right.mutual - left.mutual)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <ReportHero
        eyebrow="Department Mode"
        title={`${selectedDepartment} next actions`}
        summary="This page translates the analytics into a small set of concrete management actions so the client can move from insight to intervention."
        value={priorities.length.toString()}
        valueLabel="Recommended actions"
        tone="neutral"
        action="Work through these in sequence instead of trying to fix every weak signal at once."
      />
      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Action Priorities</CardTitle>
          <CardDescription>
            Converts the signal into executive-ready talking points and manager-owned
            actions for {selectedDepartment}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionLadder title="Recommended sequence" items={priorities} />
        </CardContent>
      </Card>

      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Strengths To Scale</CardTitle>
          <CardDescription>
            High-trust relationships that can be used as proof points or internal
            mentors when improvement work begins.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {protectionRows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-surface-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-nsp-blue-500" />
                  <p className="font-semibold text-text-primary">{row.partner}</p>
                </div>
                <ScoreChip value={row.mutual} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

