"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { ScoreTable } from "@/components/collaboration/score-table";
import { ColorLegend } from "@/components/collaboration/color-legend";
import {
  scoreScaleColor,
  scoreScaleTextColor,
} from "@/components/collaboration/score-color-scale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import { getDataBoxSurfaceStyle } from "@/lib/collaboration/data-box-surface";
import { INTEGRATION_SCORE_SCALE } from "@/lib/integration-effectiveness/score-scale";
import type {
  IntegrationBrandReport,
  IntegrationCommentTheme,
  IntegrationDashboardData,
  IntegrationGroupMetric,
  IntegrationHeatmap,
  IntegrationPriority,
  IntegrationVoiceEntry,
} from "@/types/integration-effectiveness";

const VOICE_PROMPTS = {
  improvement: "What is the one thing Canopy could do in the next 30 days to make your experience even better?",
  strengths: "What is working especially well so far that Canopy should keep doing or do more of?",
  preserve: "Is there anything about the old way of doing things that should be preserved or brought back?",
  additional: "Any additional comments you would like Canopy leadership to hear?",
} as const;

interface DashboardTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface DashboardProps {
  data: IntegrationDashboardData;
}

type SortDirection = "asc" | "desc";
type SortField = "label" | "score";

function sortByScoreDesc<T extends { score: number }>(rows: T[]) {
  return rows.slice().sort((left, right) => right.score - left.score);
}

function sortByScoreAsc<T extends { score: number }>(rows: T[]) {
  return rows.slice().sort((left, right) => left.score - right.score);
}

function sortMetricRows(
  rows: IntegrationGroupMetric[],
  field: SortField,
  direction: SortDirection
) {
  const sorted = rows.slice().sort((left, right) => {
    if (field === "label") {
      return left.label.localeCompare(right.label);
    }
    return left.score - right.score;
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

function averageScore(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(
  value: number,
  min = INTEGRATION_SCORE_SCALE.minValue,
  max = INTEGRATION_SCORE_SCALE.maxValue
) {
  return Math.max(min, Math.min(max, Math.round(value * 100) / 100));
}

function campaignSequenceRank(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized === "initial") return 0;
  if (normalized === "midpoint") return 1;
  return 2;
}

function getScoreBadgeStyle(score: number) {
  return {
    backgroundColor: scoreScaleColor(
      score,
      INTEGRATION_SCORE_SCALE.minValue,
      INTEGRATION_SCORE_SCALE.midpoint,
      INTEGRATION_SCORE_SCALE.maxValue
    ),
    color: scoreScaleTextColor(
      score,
      INTEGRATION_SCORE_SCALE.midpoint,
      0.8,
      INTEGRATION_SCORE_SCALE.minValue,
      INTEGRATION_SCORE_SCALE.maxValue
    ),
  };
}

function getScoreCardStyle(score: number) {
  return {
    ...getDataBoxSurfaceStyle(),
    backgroundColor: scoreScaleColor(
      score,
      INTEGRATION_SCORE_SCALE.minValue,
      INTEGRATION_SCORE_SCALE.midpoint,
      INTEGRATION_SCORE_SCALE.maxValue
    ),
    color: scoreScaleTextColor(
      score,
      INTEGRATION_SCORE_SCALE.midpoint,
      0.8,
      INTEGRATION_SCORE_SCALE.minValue,
      INTEGRATION_SCORE_SCALE.maxValue
    ),
  };
}

function sortHeatmapRowsByTotal(heatmap: IntegrationHeatmap) {
  return heatmap.rows
    .slice()
    .sort((left, right) => (heatmap.rowTotals[right] ?? 0) - (heatmap.rowTotals[left] ?? 0));
}

function withSyntheticMidpointMetric(rows: IntegrationGroupMetric[]) {
  if (rows.some((row) => row.label === "Midpoint")) return rows;

  const initialRow = rows[0];
  const baseScore = initialRow?.score ?? INTEGRATION_SCORE_SCALE.midpoint;
  const baseCount = initialRow?.respondentCount ?? 4;
  const midpointDelta = baseScore >= INTEGRATION_SCORE_SCALE.midpoint ? -0.12 : 0.14;

  return [
    ...rows,
    {
      id: "midpoint-visual",
      label: "Midpoint",
      respondentCount: Math.max(3, baseCount),
      score: clampScore(baseScore + midpointDelta),
      favorablePct: 0,
    },
  ].sort(
    (left, right) =>
      campaignSequenceRank(left.label) - campaignSequenceRank(right.label) ||
      left.label.localeCompare(right.label)
  );
}

function withSyntheticMidpointHeatmap(heatmap: IntegrationHeatmap) {
  if (heatmap.columns.includes("Midpoint")) return heatmap;

  const deltas = [0.18, -0.11, 0.23, -0.07, 0.14, -0.19, 0.09, -0.13, 0.16, -0.05, 0.12];
  const sourceColumn = heatmap.columns[0] ?? "Initial";

  return {
    ...heatmap,
    columns: [...heatmap.columns, "Midpoint"].sort(
      (left, right) =>
        campaignSequenceRank(left) - campaignSequenceRank(right) || left.localeCompare(right)
    ),
    data: heatmap.data.map((row) => ({
      ...row,
      scores: {
        ...row.scores,
        Midpoint: clampScore(
          (row.scores[sourceColumn] ??
            heatmap.rowTotals[row.department] ??
            INTEGRATION_SCORE_SCALE.midpoint) +
            deltas[Math.abs(row.department.length) % deltas.length]
        ),
      },
    })),
    columnTotals: {
      ...heatmap.columnTotals,
      Midpoint: clampScore(
        averageScore(
          heatmap.data.map((row) =>
            clampScore(
              (row.scores[sourceColumn] ??
                heatmap.rowTotals[row.department] ??
                INTEGRATION_SCORE_SCALE.midpoint) +
                deltas[Math.abs(row.department.length) % deltas.length]
            )
          )
        )
      ),
    },
  };
}

function HeaderTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{children}</p>;
}

function buildBrandSummary(brandReport: IntegrationBrandReport) {
  const weakest = brandReport.questionMetrics[0];
  const strongest = sortByScoreDesc(brandReport.questionMetrics)[0];
  const improvementText = brandReport.voice.improvement.map((entry) => entry.text.toLowerCase()).join(" ");
  const supportSignal = improvementText.includes("train")
    ? "better training"
    : improvementText.includes("meeting")
      ? "more direct meetings"
      : improvementText.includes("commun")
        ? "clearer communication"
        : "steadier support";

  return `${brandReport.selectedBrand} shows a mixed early integration picture, with ${strongest?.shortLabel.toLowerCase() ?? "clearer strengths"} stronger, ${weakest?.shortLabel.toLowerCase() ?? "weaker process areas"} softer, and comments pushing for ${supportSignal}.`;
}

function dedupePriorityGroups(
  firstGroup: IntegrationPriority[],
  secondGroup: IntegrationPriority[]
): [IntegrationPriority[], IntegrationPriority[]] {
  const usedActions = new Set<string>();
  const dedupe = (items: IntegrationPriority[]) =>
    items.filter((item) => {
      const actionKey = item.action.trim().toLowerCase();
      if (usedActions.has(actionKey)) return false;
      usedActions.add(actionKey);
      return true;
    });

  return [dedupe(firstGroup), dedupe(secondGroup)];
}

function CompactPriorityList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: IntegrationPriority[];
}) {
  return (
    <Card className="border-border-strong">
      <CardHeader className="pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 pt-0">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${index > 0 ? "border-t border-border-strong" : ""} py-4`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-2 text-sm text-text-primary">
                  <span className="font-semibold">Recommended Action:</span> {item.action}
                </p>
              </div>
              <span
                className="inline-flex shrink-0 rounded-2xl px-2.5 py-1 text-xs font-semibold"
                style={getScoreBadgeStyle(item.score)}
              >
                {formatScoreForDisplay(item.score)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function VoiceList({
  title,
  prompt,
  entries,
}: {
  title: string;
  prompt: string;
  entries: IntegrationVoiceEntry[];
}) {
  return (
    <Card className="border-border-strong">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{prompt}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-text-secondary">No usable comments were captured in this section.</p>
        ) : (
          entries.slice(0, 8).map((entry) => (
            <div key={entry.id} className="rounded-2xl bg-surface-2 px-4 py-4">
              <p className="text-sm leading-relaxed text-text-primary">&ldquo;{entry.text}&rdquo;</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                {entry.brand} | {entry.department}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SegmentLensRow({
  eyebrow,
  title,
  description,
  tableTitle,
  heatmapTitle,
  labelHeader,
  rows,
  heatmap,
  showVisualNote = false,
  defaultSortField = "score",
  defaultSortDirection = "desc",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tableTitle: string;
  heatmapTitle: string;
  labelHeader: string;
  rows: IntegrationGroupMetric[];
  heatmap: IntegrationHeatmap;
  showVisualNote?: boolean;
  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
}) {
  const sortedHeatmapRows = useMemo(() => sortHeatmapRowsByTotal(heatmap), [heatmap]);

  return (
    <section className="border-t border-border-strong pt-8 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <HeaderTitle>{eyebrow}</HeaderTitle>
        <h3 className="mt-2 text-2xl font-bold text-text-primary">{title}</h3>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <SortableMetricTable
          title={tableTitle}
          labelHeader={labelHeader}
          rows={rows}
          minValue={INTEGRATION_SCORE_SCALE.minValue}
          midpoint={INTEGRATION_SCORE_SCALE.midpoint}
          maxValue={INTEGRATION_SCORE_SCALE.maxValue}
          defaultSortField={defaultSortField}
          defaultSortDirection={defaultSortDirection}
        />
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>{heatmapTitle}</CardTitle>
            <CardDescription>
              {showVisualNote
                ? "Includes a placeholder Midpoint column for this layout preview."
                : "Statement rows are ordered by total score so the strongest signals sit at the top."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <HeatmapChart
              rows={sortedHeatmapRows}
              columns={heatmap.columns}
              data={heatmap.data}
              rowTotals={heatmap.rowTotals}
              columnTotals={heatmap.columnTotals}
              minValue={INTEGRATION_SCORE_SCALE.minValue}
              midpoint={INTEGRATION_SCORE_SCALE.midpoint}
              maxValue={INTEGRATION_SCORE_SCALE.maxValue}
              rowLabelHeader="Statement"
              abbreviateHeaders={false}
              columnMinWidthClassName="min-w-[112px]"
              columnWidthClassName="w-[112px]"
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function SortableMetricTable({
  title,
  labelHeader,
  rows,
  minValue = 3,
  midpoint = 6,
  maxValue = 9,
  defaultSortField = "score",
  defaultSortDirection = "desc",
}: {
  title: string;
  labelHeader: string;
  rows: IntegrationGroupMetric[];
  minValue?: number;
  midpoint?: number;
  maxValue?: number;
  defaultSortField?: SortField;
  defaultSortDirection?: SortDirection;
}) {
  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const sortedRows = useMemo(
    () => sortMetricRows(rows, sortField, sortDirection),
    [rows, sortField, sortDirection]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection(field === "label" ? "asc" : "desc");
  };

  return (
    <Card className="border-border-strong">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-2xl border border-border-strong">
          <table className="w-full text-sm">
            <thead className="bg-surface-3">
              <tr>
                <th className="px-4 py-2.5 text-left">
                  <button
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted"
                    onClick={() => toggleSort("label")}
                  >
                    {labelHeader}
                    <ArrowDownUp className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-right">
                  <button
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted"
                    onClick={() => toggleSort("score")}
                  >
                    Index
                    <ArrowDownUp className="h-3.5 w-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-t border-border-strong ${
                    index % 2 === 0 ? "bg-white" : "bg-surface-2/50"
                  }`}
                >
                  <td className="px-4 py-3 text-text-primary">
                    <div>
                      <p className="font-semibold">{row.label}</p>
                      <p className="text-xs text-text-muted">{row.respondentCount} responses</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-block min-w-[52px] rounded-2xl px-2 py-0.5 text-center text-xs font-bold"
                      style={getScoreBadgeStyle(row.score)}
                    >
                      {formatScoreForDisplay(row.score)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function IntegrationEffectivenessDashboardClient({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const tabs: DashboardTab[] = [
    { id: "overview", label: "Overview", content: <OverviewTab data={data} /> },
    { id: "statements", label: "Statement Breakdown", content: <StatementsTab data={data} /> },
    { id: "priorities", label: "Protect & Prioritize", content: <PrioritiesTab data={data} /> },
    { id: "brand", label: "Brand Report", content: <BrandReportTab data={data} /> },
    { id: "voice", label: "Employee Voice", content: <VoiceTab data={data} /> },
  ];

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content ?? tabs[0]?.content;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-border-strong bg-white shadow-sm">
        <header className="flex flex-wrap items-center gap-5 px-5 py-5">
          <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-2xl border border-border-strong bg-white p-3 shadow-sm">
            <Image
              src="/canopy-logo.png"
              alt="Canopy Services logo"
              fill
              sizes="176px"
              className="object-contain p-2"
              priority
            />
          </div>
          <div className="max-w-4xl">
            <h1 className="font-serif text-3xl font-bold text-text-primary">
              Integration Dashboard - Canopy Services Group
            </h1>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              Brand Integration Campaign Results
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              A first-wave leadership view of how newly acquired brands are experiencing the integration
              process, where operating friction is showing up, and what the current employee signal suggests
              Canopy should protect, repair, or learn from.
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-t border-border-strong bg-surface-3/90 px-3 py-2.5">
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-nsp-blue-500 text-white shadow-sm"
                    : "text-text-secondary hover:bg-white hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <ColorLegend
              minLabel={INTEGRATION_SCORE_SCALE.minLabel}
              maxLabel={INTEGRATION_SCORE_SCALE.maxLabel}
            />
          </div>
        </div>
      </section>

      <div className="min-h-[700px]">{activeTabContent}</div>
    </div>
  );
}

function OverviewTab({ data }: { data: IntegrationDashboardData }) {
  const weakestQuestion = data.questionMetrics[0];
  const strongestQuestion = sortByScoreDesc(data.questionMetrics)[0];
  const lowestBrand = sortByScoreAsc(data.brandMetrics)[0];
  const highestBrand = sortByScoreDesc(data.brandMetrics)[0];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border-strong bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/40">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <HeaderTitle>Leadership Readout</HeaderTitle>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary">
              {data.overview.assessment}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">
              {data.overview.summary}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-text-primary">
              The current file suggests that leadership confidence in Canopy&apos;s long-term value is
              stronger than the day-to-day integration experience. The weaker signal is showing up in
              communication, participation, and the smoothness of the process itself.
            </p>
          </div>
          <div className="grid max-w-[220px] gap-3 justify-self-end">
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-2 px-4 py-4 text-center shadow-sm"
              style={getScoreCardStyle(data.overview.integrationIndex)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Integration Index
              </p>
              <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">
                {formatScoreForDisplay(data.overview.integrationIndex)}
              </p>
            </div>
            <div className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-white px-4 py-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Responses
              </p>
              <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">
                {data.meta.totalRespondents}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>What appears to be landing</CardTitle>
            <CardDescription>
              These signals are not the whole story, but they are useful proof points for future integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl px-4 py-4" style={getScoreCardStyle(strongestQuestion?.score ?? INTEGRATION_SCORE_SCALE.maxValue)}>
              <p className="font-semibold text-text-primary">{strongestQuestion?.shortLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {strongestQuestion?.statement}
              </p>
            </div>
            <div className="rounded-2xl px-4 py-4" style={getScoreCardStyle(highestBrand?.score ?? INTEGRATION_SCORE_SCALE.maxValue)}>
              <p className="font-semibold text-text-primary">
                {highestBrand?.label ?? "Highest brand"} is the warmer brand right now
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                That makes it a useful comparison point for what Canopy is doing differently when the
                transition experience feels more stable.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Where leadership should lean in</CardTitle>
            <CardDescription>
              This wave is clear enough to show what needs attention without overcomplicating the read.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl px-4 py-4" style={getScoreCardStyle(weakestQuestion?.score ?? INTEGRATION_SCORE_SCALE.minValue)}>
              <p className="font-semibold text-text-primary">{weakestQuestion?.shortLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {weakestQuestion?.statement}
              </p>
            </div>
            <div className="rounded-2xl px-4 py-4" style={getScoreCardStyle(lowestBrand?.score ?? INTEGRATION_SCORE_SCALE.minValue)}>
              <p className="font-semibold text-text-primary">
                {lowestBrand?.label ?? "Lowest brand"} is the colder brand right now
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Use the Brand Report to see what that brand is saying, where the masked group cuts still
                reveal usable patterns, and which comments leaders should not ignore.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PrioritiesTab({ data }: { data: IntegrationDashboardData }) {
  const [strengthItems, priorityItems] = dedupePriorityGroups(data.strengths, data.priorities);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <CompactPriorityList
          title="Strengths to Protect"
          description="The strongest proof points from this wave, combined into one readable view on the left."
          items={strengthItems}
        />
        <CompactPriorityList
          title="Priority Focus"
          description="The clearest intervention areas, combined into one leadership action view on the right."
          items={priorityItems}
        />
      </div>
    </div>
  );
}

function StatementsTab({ data }: { data: IntegrationDashboardData }) {
  const weakest = data.questionMetrics[0];
  const strongest = sortByScoreDesc(data.questionMetrics)[0];
  const questionBars = sortByScoreAsc(data.questionMetrics)
    .reverse()
    .map((question) => ({
      name: question.shortLabel,
      value: question.score,
    }));
  const dimensionRows = data.dimensionMetrics.map((row) => ({
    label: row.label,
    score: row.score,
  }));

  return (
    <div className="space-y-8">
      <Card className="border-border-strong">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <HeaderTitle>Statement-level read</HeaderTitle>
            <h2 className="mt-2 text-3xl font-extrabold text-text-primary">
              Communication and participation are the main pressure points.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              The file is telling a straightforward story: belief in the long-term upside is relatively
              strong, but the current experience of change feels much more uneven.
            </p>
          </div>
          <div className="grid gap-3">
          <div className="rounded-2xl px-4 py-3" style={getScoreCardStyle(weakest?.score ?? INTEGRATION_SCORE_SCALE.minValue)}>
              <HeaderTitle>Weakest statement</HeaderTitle>
              <p className="mt-1 font-bold text-text-primary">{weakest?.shortLabel ?? "—"}</p>
            </div>
          <div className="rounded-2xl px-4 py-3" style={getScoreCardStyle(strongest?.score ?? INTEGRATION_SCORE_SCALE.maxValue)}>
              <HeaderTitle>Strongest statement</HeaderTitle>
              <p className="mt-1 font-bold text-text-primary">{strongest?.shortLabel ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7">
          <Card className="h-full border-border-strong">
            <CardHeader>
              <CardTitle>Integration Statements</CardTitle>
              <CardDescription>
                Higher is better. Displayed on a {INTEGRATION_SCORE_SCALE.rangeLabel} color scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <GradientBarChart
                data={questionBars}
                average={data.overview.integrationIndex}
                minValue={INTEGRATION_SCORE_SCALE.minValue}
                midpoint={INTEGRATION_SCORE_SCALE.midpoint}
                maxValue={INTEGRATION_SCORE_SCALE.maxValue}
              />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-5">
          <ScoreTable
            title="Dimension Scores"
            headers={["Dimension", "Index"]}
            rows={dimensionRows}
            minValue={INTEGRATION_SCORE_SCALE.minValue}
            midpoint={INTEGRATION_SCORE_SCALE.midpoint}
            maxValue={INTEGRATION_SCORE_SCALE.maxValue}
            className="h-full"
          />
        </div>
      </div>

      <div className="border-t border-border-strong pt-8">
        <FunctionSegmentSections data={data} />
      </div>
    </div>
  );
}

function BrandReportTab({ data }: { data: IntegrationDashboardData }) {
  const [selectedBrand, setSelectedBrand] = useState(data.brandReports[0]?.selectedBrand ?? "");
  const brandReport =
    data.brandReports.find((report) => report.selectedBrand === selectedBrand) ?? data.brandReports[0];

  if (!brandReport) return null;

  const weakestQuestion = brandReport.questionMetrics[0];
  const strongestQuestion = sortByScoreDesc(brandReport.questionMetrics)[0];
  const questionBars = sortByScoreAsc(brandReport.questionMetrics)
    .reverse()
    .map((question) => ({ name: question.shortLabel, value: question.score }));
  const departmentRows = brandReport.departmentMetrics.map((row) => ({
    label: row.label,
    score: row.score,
  }));
  const jobTitleRows = brandReport.jobTitleMetrics.map((row) => ({
    label: row.label,
    score: row.score,
  }));
  const departmentHeatmapRows = brandReport.departmentHeatmap.rows
    .slice()
    .sort(
      (left, right) =>
        (brandReport.departmentHeatmap.rowTotals[right] ?? 0) -
        (brandReport.departmentHeatmap.rowTotals[left] ?? 0)
    );
  const jobTitleHeatmapRows = brandReport.jobTitleHeatmap.rows
    .slice()
    .sort(
      (left, right) =>
        (brandReport.jobTitleHeatmap.rowTotals[right] ?? 0) -
        (brandReport.jobTitleHeatmap.rowTotals[left] ?? 0)
    );
  const [protectItems, focusItems] = dedupePriorityGroups(
    brandReport.strengths.slice(0, 3),
    brandReport.priorities.slice(0, 3)
  );

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <HeaderTitle>Selected Brand</HeaderTitle>
            <select
              value={selectedBrand}
              onChange={(event) => setSelectedBrand(event.target.value)}
              className="mt-2 min-w-[260px] rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-lg font-bold text-text-primary shadow-sm focus:border-nsp-blue-300 focus:outline-none"
            >
              {data.brandReports.map((report) => (
                <option key={report.selectedBrand} value={report.selectedBrand}>
                  {report.selectedBrand}
                </option>
              ))}
            </select>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            Grouped cuts in this report follow a strict 2-response masking rule. If a subgroup
            does not have at least two separate responses, it is hidden from segmented views while
            still contributing to broader valid aggregates.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border-strong">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <HeaderTitle>Brand summary</HeaderTitle>
            <h2 className="mt-2 text-4xl font-extrabold text-text-primary">{brandReport.selectedBrand}</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {buildBrandSummary(brandReport)}
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[0.8fr_1fr_1fr]">
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-2 px-4 py-4 text-center shadow-sm"
              style={getScoreCardStyle(brandReport.integrationIndex)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Brand Index
              </p>
              <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">
                {formatScoreForDisplay(brandReport.integrationIndex)}
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                based on {brandReport.respondentCount} responses
              </p>
            </div>
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-2 px-4 py-4 text-center shadow-sm"
              style={getScoreCardStyle(strongestQuestion?.score ?? INTEGRATION_SCORE_SCALE.maxValue)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Strongest Statement
              </p>
              <p className="mt-2 font-bold text-text-primary">{strongestQuestion?.shortLabel ?? "—"}</p>
            </div>
            <div
              className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-surface-2 px-4 py-4 text-center shadow-sm"
              style={getScoreCardStyle(weakestQuestion?.score ?? INTEGRATION_SCORE_SCALE.minValue)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Weakest Statement
              </p>
              <p className="mt-2 font-bold text-text-primary">{weakestQuestion?.shortLabel ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <Card className="h-full border-border-strong">
            <CardHeader>
              <CardTitle>Statement Scores</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <GradientBarChart
                data={questionBars}
                average={brandReport.integrationIndex}
                minValue={INTEGRATION_SCORE_SCALE.minValue}
                midpoint={INTEGRATION_SCORE_SCALE.midpoint}
                maxValue={INTEGRATION_SCORE_SCALE.maxValue}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-5">
          <ScoreTable
            title="Departments"
            headers={["Department", "Index"]}
            rows={departmentRows}
            minValue={INTEGRATION_SCORE_SCALE.minValue}
            midpoint={INTEGRATION_SCORE_SCALE.midpoint}
            maxValue={INTEGRATION_SCORE_SCALE.maxValue}
          />
          <ScoreTable
            title="Job Titles"
            headers={["Job Title", "Index"]}
            rows={jobTitleRows}
            minValue={INTEGRATION_SCORE_SCALE.minValue}
            midpoint={INTEGRATION_SCORE_SCALE.midpoint}
            maxValue={INTEGRATION_SCORE_SCALE.maxValue}
          />
        </div>
      </div>

      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Department Heatmap</CardTitle>
          <CardDescription>
            Only department-level cells backed by at least two responses are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <HeatmapChart
            rows={departmentHeatmapRows}
            columns={brandReport.departmentHeatmap.columns}
            data={brandReport.departmentHeatmap.data}
            rowTotals={brandReport.departmentHeatmap.rowTotals}
            columnTotals={brandReport.departmentHeatmap.columnTotals}
            minValue={INTEGRATION_SCORE_SCALE.minValue}
            midpoint={INTEGRATION_SCORE_SCALE.midpoint}
            maxValue={INTEGRATION_SCORE_SCALE.maxValue}
            rowLabelHeader="Statement"
            abbreviateHeaders={false}
            columnMinWidthClassName="min-w-[112px]"
            columnWidthClassName="w-[112px]"
          />
        </CardContent>
      </Card>

      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Job Title Heatmap</CardTitle>
          <CardDescription>
            Only job-title cells backed by at least two responses are shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <HeatmapChart
            rows={jobTitleHeatmapRows}
            columns={brandReport.jobTitleHeatmap.columns}
            data={brandReport.jobTitleHeatmap.data}
            rowTotals={brandReport.jobTitleHeatmap.rowTotals}
            columnTotals={brandReport.jobTitleHeatmap.columnTotals}
            minValue={INTEGRATION_SCORE_SCALE.minValue}
            midpoint={INTEGRATION_SCORE_SCALE.midpoint}
            maxValue={INTEGRATION_SCORE_SCALE.maxValue}
            rowLabelHeader="Statement"
            abbreviateHeaders={false}
            columnMinWidthClassName="min-w-[112px]"
            columnWidthClassName="w-[112px]"
          />
        </CardContent>
      </Card>

      <div className="border-t border-border-strong pt-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <CompactPriorityList
            title="Protect"
            description="The strongest signals worth preserving as the integration continues."
            items={protectItems}
          />
          <CompactPriorityList
            title="Focus"
            description="The clearest areas where leaders should intervene directly."
            items={focusItems}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <VoiceList
          title="What this brand wants improved"
          prompt={VOICE_PROMPTS.improvement}
          entries={brandReport.voice.improvement}
        />
        <VoiceList
          title="What this brand says is working"
          prompt={VOICE_PROMPTS.strengths}
          entries={brandReport.voice.strengths}
        />
      </div>
    </div>
  );
}

function FunctionSegmentSections({ data }: { data: IntegrationDashboardData }) {
  const campaignRows = useMemo(
    () => withSyntheticMidpointMetric(data.campaignMetrics),
    [data.campaignMetrics]
  );
  const campaignHeatmap = useMemo(
    () => withSyntheticMidpointHeatmap(data.heatmaps.campaigns),
    [data.heatmaps.campaigns]
  );

  return (
    <div className="space-y-8">
      <SegmentLensRow
        eyebrow="Segment 1"
        title="Campaign"
        description="Use this top row as the campaign-level read. A placeholder Midpoint view is included here only so this section previews how a future pulse comparison could look."
        tableTitle="Campaign Breakdown"
        heatmapTitle="Campaign Heatmap"
        labelHeader="Campaign"
        rows={campaignRows}
        heatmap={campaignHeatmap}
        showVisualNote
        defaultSortField="label"
        defaultSortDirection="asc"
      />
      <SegmentLensRow
        eyebrow="Segment 2"
        title="Brand"
        description="This row shows which brands are running hotter or colder overall, and which statements are driving that spread."
        tableTitle="Brand Breakdown"
        heatmapTitle="Brand Heatmap"
        labelHeader="Brand"
        rows={data.brandMetrics}
        heatmap={data.heatmaps.brands}
      />
      <SegmentLensRow
        eyebrow="Segment 3"
        title="Department"
        description="Department is the operating cut. Use it to see where the lived experience changes most clearly across teams."
        tableTitle="Department Breakdown"
        heatmapTitle="Department Heatmap"
        labelHeader="Department"
        rows={data.departmentMetrics.filter((metric) => metric.respondentCount >= 2)}
        heatmap={data.heatmaps.departments}
      />
      <SegmentLensRow
        eyebrow="Segment 4"
        title="Job Title"
        description="Job title highlights whether the integration story changes by role and level, not just by org structure."
        tableTitle="Job Title Breakdown"
        heatmapTitle="Job Title Heatmap"
        labelHeader="Job Title"
        rows={data.jobTitleMetrics}
        heatmap={data.heatmaps.jobTitles}
      />
      <SegmentLensRow
        eyebrow="Segment 5"
        title="Campaign Date"
        description="Campaign date shows whether the timing of collection is producing a materially different read across the same statement set."
        tableTitle="Campaign Date Breakdown"
        heatmapTitle="Campaign Date Heatmap"
        labelHeader="Campaign Date"
        rows={data.campaignDateMetrics}
        heatmap={data.heatmaps.campaignDates}
      />
    </div>
  );
}

function VoiceTab({ data }: { data: IntegrationDashboardData }) {
  const totalUsableComments =
    data.voice.improvement.length +
    data.voice.strengths.length +
    data.voice.preserve.length +
    data.voice.additional.length;

  const themeColumns = [
    { key: "label", header: "Theme" },
    {
      key: "mentionCount",
      header: "Mentions",
      render: (row: IntegrationCommentTheme) => (
        <span className="font-semibold text-text-primary">{row.mentionCount}</span>
      ),
    },
    {
      key: "synopsis",
      header: "Synopsis",
      render: (row: IntegrationCommentTheme) => (
        <span className="text-sm text-text-secondary">{row.synopsis}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <HeaderTitle>Voice of employee</HeaderTitle>
            <h2 className="mt-2 text-3xl font-extrabold text-text-primary">
              The comments make the integration risk specific.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              The written comments repeatedly point back to communication, inclusion, and how much the
              transition still feels done to people rather than with them.
            </p>
          </div>
          <div className="w-full max-w-[220px] rounded-2xl border border-border-strong bg-white px-5 py-5 shadow-sm">
            <HeaderTitle>Comments</HeaderTitle>
            <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">
              {totalUsableComments}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>
            A concise roll-up of the repeated patterns showing up across written comments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={themeColumns}
            data={data.commentThemes}
            emptyMessage="No clear themes detected."
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <VoiceList
          title="What is working well"
          prompt={VOICE_PROMPTS.strengths}
          entries={data.voice.strengths}
        />
        <VoiceList
          title="What is one thing Canopy could do better"
          prompt={VOICE_PROMPTS.improvement}
          entries={data.voice.improvement}
        />
        <VoiceList
          title="What from the old way should be preserved"
          prompt={VOICE_PROMPTS.preserve}
          entries={data.voice.preserve}
        />
        <VoiceList
          title="Additional comments"
          prompt={VOICE_PROMPTS.additional}
          entries={data.voice.additional}
        />
      </div>
    </div>
  );
}
