"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { ScoreTable } from "@/components/collaboration/score-table";
import { ColorLegend } from "@/components/collaboration/color-legend";
import { DashboardCanvas, DashboardRibbon } from "@/components/dashboard/dashboard-shell";
import {
  VisualExportProvider,
  VisualExportMetaSetter,
} from "@/components/dashboard/visual-export-registry";
import { CompositeVisualExportButton } from "@/components/dashboard/composite-visual-export-button";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import {
  buildDashboardExportFilename,
} from "@/lib/dashboard/export-visual";
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
import { Select } from "@/components/ui/select";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import { getDataBoxSurfaceStyle } from "@/lib/collaboration/data-box-surface";
import { INTEGRATION_SCORE_SCALE } from "@/lib/integration-effectiveness/score-scale";
import {
  resolveAllowedValuesForPerspective,
  type EmployeeExperienceUserAccess,
} from "@/lib/firebase/user-access";
import type { DashboardPerspectiveInstance } from "@/types/portal";
import type {
  IntegrationBrandReport,
  IntegrationQuestionMetric,
  IntegrationDashboardData,
  IntegrationGroupMetric,
  IntegrationHeatmap,
  IntegrationLongitudinalScope,
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
  perspectiveInstances?: DashboardPerspectiveInstance[];
  portalAccess?: EmployeeExperienceUserAccess;
}

interface IntegrationPerspectiveDefinition extends DashboardTab {
  rendererKey: string;
  categoryIds: string[];
  categoryLabels: string[];
}

interface IntegrationCategorySection {
  id: string;
  label: string;
  tabIds: string[];
}

type SortDirection = "asc" | "desc";
type SortField = "label" | "score";
type LongitudinalSummaryRow = {
  id: string;
  label: string;
  campaign1: number | null;
  campaign2: number | null;
  campaign3: number | null;
  growthToCampaign2: number | null;
  growthToCampaign3: number | null;
};
type LongitudinalLens = "overall" | "statement" | "department";
type VoiceThemeSummary = {
  id: string;
  label: string;
  mentionCount: number;
};
type LongitudinalSeriesEntry = {
  id: string;
  label: string;
  color: string;
  campaign1: number | null;
  campaign2: number | null;
  campaign3: number | null;
};

const LONGITUDINAL_SERIES_COLORS = [
  "#102F4A",
  "#3B5F78",
  "#5C7D93",
  "#C89A0B",
  "#B9654E",
  "#7A8E5C",
] as const;
const VOICE_SENTIMENT_COLORS = {
  negative: "#E7B0A5",
  neutral: "#DCD6CC",
  positive: "#B8C5D4",
} as const;
const VOICE_THEME_DEFINITIONS = [
  {
    id: "communication-clarity",
    label: "Communication Clarity",
    keywords: ["communication", "communicate", "messaging", "updates", "clarity", "transparent"],
  },
  {
    id: "leadership-visibility",
    label: "Leadership Visibility",
    keywords: ["leader", "leadership", "manager", "executive", "visibility", "direction"],
  },
  {
    id: "training-support",
    label: "Training and Support",
    keywords: ["training", "support", "resources", "help", "guidance", "coaching"],
  },
  {
    id: "change-process",
    label: "Change Process Experience",
    keywords: ["process", "transition", "change", "integration", "rollout", "implementation"],
  },
  {
    id: "team-collaboration",
    label: "Team Collaboration",
    keywords: ["team", "collaboration", "together", "partnership", "cross-functional", "alignment"],
  },
  {
    id: "trust-morale",
    label: "Trust and Morale",
    keywords: ["trust", "morale", "confidence", "culture", "engagement", "motivation"],
  },
] as const;
const POSITIVE_SENTIMENT_TERMS = [
  "good",
  "great",
  "clear",
  "supportive",
  "helpful",
  "positive",
  "confident",
  "smooth",
  "strong",
  "better",
  "appreciate",
  "aligned",
];
const NEGATIVE_SENTIMENT_TERMS = [
  "poor",
  "bad",
  "confusing",
  "unclear",
  "frustrating",
  "negative",
  "difficult",
  "weak",
  "concern",
  "lack",
  "missing",
  "stress",
  "slow",
];

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

function HeaderTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted sm:text-base">
      {children}
    </p>
  );
}

function FilterRailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-border-strong">
      <CardHeader className={open ? undefined : "pb-4"}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <CardTitle>{title}</CardTitle>
            {description && open ? <CardDescription className="mt-2">{description}</CardDescription> : null}
          </span>
          <span className="rounded-full border border-border-strong px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {open ? "Hide" : "Show"}
          </span>
        </button>
      </CardHeader>
      {open ? <CardContent className="space-y-4 pt-0">{children}</CardContent> : null}
    </Card>
  );
}

function IntegrationFilterRail({ children }: { children: React.ReactNode }) {
  return <div className="xl:sticky xl:top-6 xl:self-start">{children}</div>;
}

function currentCampaignMark(data: IntegrationDashboardData) {
  const campaignCount = Math.max(1, Math.min(3, data.meta.totalCampaigns || data.meta.campaigns.length || 1));
  return `Campaign ${campaignCount}` as const;
}

function currentCampaignMarkFromSeries(series: LongitudinalSeriesEntry[]) {
  const hasCampaign3 = series.some((entry) => entry.campaign3 != null);
  const hasCampaign2 = series.some((entry) => entry.campaign2 != null);
  if (hasCampaign3) return "Campaign 3" as const;
  if (hasCampaign2) return "Campaign 2" as const;
  return "Campaign 1" as const;
}

function buildCurrentCampaignSeries(
  label: string,
  score: number | null,
  currentMark: string,
  color: string
): LongitudinalSeriesEntry {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    color,
    campaign1: currentMark === "Campaign 1" ? score : null,
    campaign2: currentMark === "Campaign 2" ? score : null,
    campaign3: currentMark === "Campaign 3" ? score : null,
  };
}

function buildSeriesFromLongitudinalScope(
  scope: IntegrationLongitudinalScope,
  selectedBrand: string
): LongitudinalSeriesEntry[] {
  const visibleBrands =
    selectedBrand === "all"
      ? scope.brands
      : scope.brands.filter((series) => series.label === selectedBrand);

  return [
    {
      ...scope.organization,
      color: LONGITUDINAL_SERIES_COLORS[0],
    },
    ...visibleBrands.map((series, index) => ({
      ...series,
      color: LONGITUDINAL_SERIES_COLORS[(index + 1) % LONGITUDINAL_SERIES_COLORS.length],
    })),
  ];
}

function findQuestionScore(rows: IntegrationQuestionMetric[], questionId: string) {
  return rows.find((row) => row.id === questionId)?.score ?? null;
}

function findGroupScore(rows: IntegrationGroupMetric[], label: string) {
  return rows.find((row) => row.label === label)?.score ?? null;
}

function calculateGrowthPercentage(from: number | null, to: number | null) {
  if (from == null || to == null || from === 0) {
    return null;
  }

  return ((to - from) / from) * 100;
}

function formatGrowthPercentage(value: number | null) {
  if (value == null) {
    return "—";
  }

  const rounded = Math.round(value * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded.toFixed(1)}%`;
}

function buildLongitudinalCurrentStateModel(
  data: IntegrationDashboardData,
  selectedBrand: string,
  selectedQuestionId: string,
  selectedDepartment: string
) {
  const activeLens: LongitudinalLens =
    selectedDepartment !== "all" ? "department" : selectedQuestionId !== "all" ? "statement" : "overall";

  const longitudinalScope =
    activeLens === "department"
      ? data.longitudinal?.departments[selectedDepartment]
      : activeLens === "statement"
        ? data.longitudinal?.statements[selectedQuestionId]
        : data.longitudinal?.overall;

  if (longitudinalScope) {
    const series = buildSeriesFromLongitudinalScope(longitudinalScope, selectedBrand);
    const summaryRows: LongitudinalSummaryRow[] = series.map((entry) => ({
      id: entry.id,
      label: entry.label,
      campaign1: entry.campaign1,
      campaign2: entry.campaign2,
      campaign3: entry.campaign3,
      growthToCampaign2: calculateGrowthPercentage(entry.campaign1, entry.campaign2),
      growthToCampaign3: calculateGrowthPercentage(entry.campaign2, entry.campaign3),
    }));

    return {
      activeLens,
      currentMark: currentCampaignMarkFromSeries(series),
      series,
      summaryRows,
    };
  }

  const currentMark = currentCampaignMark(data);

  const organizationScore =
    activeLens === "department"
      ? findGroupScore(data.departmentMetrics, selectedDepartment)
      : activeLens === "statement"
        ? findQuestionScore(data.questionMetrics, selectedQuestionId)
        : data.overview.integrationIndex;

  const visibleBrandReports =
    selectedBrand === "all"
      ? data.brandReports
      : data.brandReports.filter((report) => report.selectedBrand === selectedBrand);

  const series: LongitudinalSeriesEntry[] = [
    buildCurrentCampaignSeries(
      "Organization",
      organizationScore,
      currentMark,
      LONGITUDINAL_SERIES_COLORS[0]
    ),
    ...visibleBrandReports.map((report, index) => {
      const brandScore =
        activeLens === "department"
          ? findGroupScore(report.departmentMetrics, selectedDepartment)
          : activeLens === "statement"
            ? findQuestionScore(report.questionMetrics, selectedQuestionId)
            : report.integrationIndex;

      return buildCurrentCampaignSeries(
        report.selectedBrand,
        brandScore,
        currentMark,
        LONGITUDINAL_SERIES_COLORS[(index + 1) % LONGITUDINAL_SERIES_COLORS.length]
      );
    }),
  ];

  const summaryRows: LongitudinalSummaryRow[] = series.map((entry) => ({
    id: entry.id,
    label: entry.label,
    campaign1: entry.campaign1,
    campaign2: entry.campaign2,
    campaign3: entry.campaign3,
    growthToCampaign2: calculateGrowthPercentage(entry.campaign1, entry.campaign2),
    growthToCampaign3: calculateGrowthPercentage(entry.campaign2, entry.campaign3),
  }));

  return {
    activeLens,
    currentMark,
    series,
    summaryRows,
  };
}

function LongitudinalNodeChart({
  series,
  currentMark,
}: {
  series: LongitudinalSeriesEntry[];
  currentMark: string;
}) {
  const width = 1200;
  const height = 420;
  const margin = { top: 48, right: 34, bottom: 44, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const minScore = INTEGRATION_SCORE_SCALE.minValue;
  const maxScore = INTEGRATION_SCORE_SCALE.maxValue;
  const scoreTicks = [
    minScore,
    minScore + (maxScore - minScore) * 0.25,
    INTEGRATION_SCORE_SCALE.midpoint,
    minScore + (maxScore - minScore) * 0.75,
    maxScore,
  ];
  const campaigns = ["Campaign 1", "Campaign 2", "Campaign 3"] as const;
  const campaignIndex = campaigns.indexOf(currentMark as (typeof campaigns)[number]);
  const safeCampaignIndex = campaignIndex === -1 ? 1 : campaignIndex;
  const xForCampaign = (index: number) =>
    margin.left + (plotWidth / Math.max(campaigns.length - 1, 1)) * index;
  const yForScore = (score: number) =>
    margin.top + ((maxScore - score) / (maxScore - minScore)) * plotHeight;

  const allPoints = series.flatMap((entry) => {
    const scores = [entry.campaign1, entry.campaign2, entry.campaign3];
    return scores
      .map((score, index) =>
        score == null
          ? null
          : {
              ...entry,
              pointId: `${entry.id}-${campaigns[index]}`,
              campaign: campaigns[index],
              campaignIndex: index,
              score,
              x: xForCampaign(index),
              y: yForScore(score),
            }
      )
      .filter((point): point is NonNullable<typeof point> => Boolean(point));
  });
  const seriesPaths = series
    .map((entry) => {
      const entryPoints = allPoints.filter((point) => point.id === entry.id);
      if (entryPoints.length < 2) return null;
      return {
        id: entry.id,
        color: entry.color,
        path: entryPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
      };
    })
    .filter((path): path is NonNullable<typeof path> => Boolean(path));
  const labelPoints = allPoints
    .filter((point) => point.campaignIndex === safeCampaignIndex)
    .sort((left, right) => left.y - right.y);

  const labelHeight = 36;
  const labelOffset = 14;
  const labelSide = safeCampaignIndex >= 2 ? "left" : "right";
  let previousLabelY = margin.top - labelHeight;
  const labelPositions = new Map<string, number>();
  labelPoints.forEach((point, index) => {
    const desiredY = point.y;
    const adjustedY = Math.max(desiredY, previousLabelY + labelHeight + 10);
    const boundedY = Math.min(
      adjustedY,
      height - margin.bottom - 8 - (labelPoints.length - index - 1) * (labelHeight + 10)
    );
    labelPositions.set(point.id, boundedY);
    previousLabelY = boundedY;
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[420px] w-full">
        {campaigns.map((campaign, index) => {
          const x = xForCampaign(index);
          return (
            <g key={campaign}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={height - margin.bottom}
                stroke="rgba(16,47,74,0.10)"
                strokeDasharray="4 6"
              />
              <text
                x={x}
                y={height - 14}
                textAnchor="middle"
                fill="#60727D"
                fontSize="12"
                fontWeight="600"
              >
                {campaign}
              </text>
            </g>
          );
        })}

        {scoreTicks.map((tick) => {
          const y = yForScore(tick);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                y1={y}
                x2={width - margin.right + 20}
                y2={y}
                stroke="rgba(16,47,74,0.08)"
              />
              <text x={18} y={y + 4} fill="#60727D" fontSize="12" fontWeight="600">
                {formatScoreForDisplay(tick)}
              </text>
            </g>
          );
        })}

        {seriesPaths.map((seriesPath) => (
          <path
            key={seriesPath.id}
            d={seriesPath.path}
            fill="none"
            stroke={seriesPath.color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.34}
          />
        ))}

        {allPoints.map((point) => (
          <circle
            key={point.pointId}
            cx={point.x}
            cy={point.y}
            r={point.campaignIndex === safeCampaignIndex ? 12 : 9}
            fill={point.color}
            fillOpacity={point.campaignIndex === safeCampaignIndex ? 1 : 0.72}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        ))}

        {labelPoints.map((point) => {
          const scoreText = `${point.label} | ${formatScoreForDisplay(point.score)}`;
          const labelWidth = Math.max(104, Math.min(184, scoreText.length * 6.9 + 26));
          const labelY = labelPositions.get(point.id) ?? point.y;
          const labelX =
            labelSide === "right" ? point.x + labelOffset : Math.max(margin.left, point.x - labelOffset - labelWidth);
          const connectorEndX = labelSide === "right" ? labelX : labelX + labelWidth;
          const textX = labelX + labelWidth / 2;

          return (
            <g key={point.id}>
              <line
                x1={point.x}
                y1={point.y}
                x2={connectorEndX}
                y2={labelY}
                stroke={point.color}
                strokeWidth={1.5}
                strokeOpacity={0.35}
              />
              <rect
                x={labelX}
                y={labelY - labelHeight / 2}
                rx={12}
                ry={12}
                width={labelWidth}
                height={labelHeight}
                fill="#EEF3F6"
                stroke="rgba(16,47,74,0.08)"
                filter="drop-shadow(0px 8px 18px rgba(16,35,51,0.08))"
              />
              <text
                x={textX}
                y={labelY + 4}
                textAnchor="middle"
                fill="#102533"
                fontSize="12"
                fontWeight="700"
              >
                {scoreText}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
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

function filterVoiceEntries(
  entries: IntegrationVoiceEntry[],
  selectedBrand: string,
  selectedCampaign: string,
  selectedSentiment: "all" | "positive" | "neutral" | "negative"
) {
  return entries.filter((entry) => {
    const brandMatch = selectedBrand === "all" || entry.brand === selectedBrand;
    const campaignMatch = selectedCampaign === "all" || entry.campaign === selectedCampaign;
    const sentimentMatch =
      selectedSentiment === "all" ||
      (!shouldExcludeFromVoiceAnalysis(entry.text) &&
        classifyVoiceSentiment(entry.text) === selectedSentiment);
    return brandMatch && campaignMatch && sentimentMatch;
  });
}

function shouldExcludeFromVoiceAnalysis(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase();
  const normalizedAlphaNumeric = normalized.replace(/[^a-z0-9]/g, "");
  const excludedPhrases = new Set(["no", "nope", "na", "nothing", "none"]);

  if (excludedPhrases.has(normalizedAlphaNumeric)) {
    return true;
  }

  if (!/[a-z0-9]/i.test(trimmed) && trimmed.length === 1) {
    return true;
  }

  return false;
}

function buildVoiceThemes(entries: IntegrationVoiceEntry[]): VoiceThemeSummary[] {
  const analyzableEntries = entries.filter((entry) => !shouldExcludeFromVoiceAnalysis(entry.text));

  if (analyzableEntries.length === 0) {
    return [];
  }

  const summaries = VOICE_THEME_DEFINITIONS.map((theme) => ({
    id: theme.id,
    label: theme.label,
    mentionCount: analyzableEntries.filter((entry) => {
      const normalized = entry.text.toLowerCase();
      return theme.keywords.some((keyword) => normalized.includes(keyword));
    }).length,
  }))
    .filter((theme) => theme.mentionCount >= 3)
    .sort((left, right) => right.mentionCount - left.mentionCount)
    .slice(0, 6);

  return summaries;
}

function classifyVoiceSentiment(text: string): "positive" | "neutral" | "negative" {
  const normalized = text.toLowerCase();
  const positiveScore = POSITIVE_SENTIMENT_TERMS.reduce(
    (total, term) => total + (normalized.includes(term) ? 1 : 0),
    0
  );
  const negativeScore = NEGATIVE_SENTIMENT_TERMS.reduce(
    (total, term) => total + (normalized.includes(term) ? 1 : 0),
    0
  );

  if (positiveScore > negativeScore) {
    return "positive";
  }

  if (negativeScore > positiveScore) {
    return "negative";
  }

  return "neutral";
}

function buildVoiceSentiment(entries: IntegrationVoiceEntry[]) {
  const analyzableEntries = entries.filter((entry) => !shouldExcludeFromVoiceAnalysis(entry.text));
  const counts = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  analyzableEntries.forEach((entry) => {
    const sentiment = classifyVoiceSentiment(entry.text);
    if (sentiment === "positive") {
      counts.positive += 1;
      return;
    }

    if (sentiment === "negative") {
      counts.negative += 1;
      return;
    }

    counts.neutral += 1;
  });

  return [
    { id: "negative", label: "Negative", value: counts.negative, color: VOICE_SENTIMENT_COLORS.negative },
    { id: "neutral", label: "Neutral", value: counts.neutral, color: VOICE_SENTIMENT_COLORS.neutral },
    { id: "positive", label: "Positive", value: counts.positive, color: VOICE_SENTIMENT_COLORS.positive },
  ];
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
                  <span className="font-semibold">Recommended Action:</span>{" "}
                  <span className="italic">{item.action}</span>
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
        <CardTitle className="text-base leading-relaxed">{prompt}</CardTitle>
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
  defaultSortField = "score",
  defaultSortDirection = "desc",
}: {
  title: string;
  labelHeader: string;
  rows: IntegrationGroupMetric[];
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

function buildIntegrationPerspectiveDefinitions(
  data: IntegrationDashboardData,
  filters: {
    longitudinalBrand: string;
    longitudinalQuestionId: string;
    longitudinalDepartment: string;
    brandReportSelectedBrand: string;
    voiceSelectedBrand: string;
    voiceSelectedCampaign: string;
    voiceSelectedSentiment: "all" | "positive" | "neutral" | "negative";
  },
  perspectiveInstances?: DashboardPerspectiveInstance[]
): IntegrationPerspectiveDefinition[] {
  const rendererMap: Record<string, React.ReactNode> = {
    "integration.overview": <OverviewTab data={data} />,
    "integration.longitudinalTrends": (
      <LongitudinalTrendsTab
        data={data}
        selectedBrand={filters.longitudinalBrand}
        selectedQuestionId={filters.longitudinalQuestionId}
        selectedDepartment={filters.longitudinalDepartment}
      />
    ),
    "integration.statementTrends": <StatementsTab data={data} />,
    "integration.protectPrioritize": <PrioritiesTab data={data} />,
    "integration.brandReport": (
      <BrandReportTab data={data} selectedBrand={filters.brandReportSelectedBrand} />
    ),
    "integration.employeeVoice": (
      <VoiceTab
        data={data}
        selectedBrand={filters.voiceSelectedBrand}
        selectedCampaign={filters.voiceSelectedCampaign}
        selectedSentiment={filters.voiceSelectedSentiment}
      />
    ),
  };

  if (!perspectiveInstances || perspectiveInstances.length === 0) {
    return [
      {
        id: "overview",
        label: "Overview",
        rendererKey: "integration.overview",
        categoryIds: ["canopy"],
        categoryLabels: ["Executive"],
        content: rendererMap["integration.overview"],
      },
      {
        id: "longitudinal",
        label: "Longitudinal Trends",
        rendererKey: "integration.longitudinalTrends",
        categoryIds: ["canopy"],
        categoryLabels: ["Executive"],
        content: rendererMap["integration.longitudinalTrends"],
      },
      {
        id: "statements",
        label: "Statement Trends",
        rendererKey: "integration.statementTrends",
        categoryIds: ["canopy"],
        categoryLabels: ["Executive"],
        content: rendererMap["integration.statementTrends"],
      },
      {
        id: "priorities",
        label: "Protect & Prioritize",
        rendererKey: "integration.protectPrioritize",
        categoryIds: ["canopy"],
        categoryLabels: ["Executive"],
        content: rendererMap["integration.protectPrioritize"],
      },
      {
        id: "brand",
        label: "Brand Report",
        rendererKey: "integration.brandReport",
        categoryIds: ["brand"],
        categoryLabels: ["Brand"],
        content: rendererMap["integration.brandReport"],
      },
      {
        id: "voice",
        label: "Employee Voice",
        rendererKey: "integration.employeeVoice",
        categoryIds: ["canopy", "brand"],
        categoryLabels: ["Executive", "Brand"],
        content: rendererMap["integration.employeeVoice"],
      },
    ];
  }

  const definitions: IntegrationPerspectiveDefinition[] = [];

  perspectiveInstances
    .filter((instance) => instance.status === "active")
    .sort((left, right) => left.order - right.order)
    .forEach((instance) => {
      const content = rendererMap[instance.rendererKey];

      if (!content) {
        return;
      }

      definitions.push({
        id: instance.id,
        label: instance.title,
        rendererKey: instance.rendererKey,
        categoryIds: instance.categoryIds ?? [],
        categoryLabels: instance.categoryLabels ?? [],
        content,
      });
    });

  return definitions;
}

function buildIntegrationCategorySections(
  perspectives: IntegrationPerspectiveDefinition[]
): IntegrationCategorySection[] {
  const sections = new Map<string, IntegrationCategorySection>();

  perspectives.forEach((perspective) => {
    perspective.categoryIds.forEach((categoryId, index) => {
      const categoryLabel = perspective.categoryLabels[index] ?? categoryId;
      const displayLabel = categoryLabel === "Canopy" ? "Executive" : categoryLabel;
      const existing = sections.get(categoryId);

      if (existing) {
        if (!existing.tabIds.includes(perspective.id)) {
          existing.tabIds.push(perspective.id);
        }
        return;
      }

      sections.set(categoryId, {
        id: categoryId,
        label: displayLabel,
        tabIds: [perspective.id],
      });
    });
  });

  return Array.from(sections.values());
}

function filterIntegrationPerspectivesForAccess(
  perspectives: IntegrationPerspectiveDefinition[],
  portalAccess?: EmployeeExperienceUserAccess
) {
  const restricted =
    portalAccess?.perspectiveAccessMode === "restricted" ||
    (portalAccess?.allowedPerspectiveIds.length ?? 0) > 0;
  if (!restricted) {
    return perspectives;
  }

  const legacyPerspectiveMap: Record<string, string> = {
    "ee-brand-report": "integration.brandReport",
  };
  const access = portalAccess;
  if (!access) {
    return perspectives;
  }
  const allowedKeys = new Set(
    access.allowedPerspectiveIds.flatMap((id) => [id, legacyPerspectiveMap[id]].filter(Boolean))
  );
  return perspectives.filter(
    (perspective) => allowedKeys.has(perspective.rendererKey) || allowedKeys.has(perspective.id)
  );
}

export function IntegrationEffectivenessDashboardClient({
  data,
  perspectiveInstances,
  portalAccess,
}: DashboardProps) {
  const [longitudinalBrand, setLongitudinalBrand] = useState("all");
  const [longitudinalQuestionId, setLongitudinalQuestionId] = useState("all");
  const [longitudinalDepartment, setLongitudinalDepartment] = useState("all");
  const [brandReportSelectedBrand, setBrandReportSelectedBrand] = useState(
    data.brandReports[0]?.selectedBrand ?? ""
  );
  const [voiceSelectedBrand, setVoiceSelectedBrand] = useState("all");
  const [voiceSelectedCampaign, setVoiceSelectedCampaign] = useState("all");
  const [voiceSelectedSentiment, setVoiceSelectedSentiment] = useState<
    "all" | "positive" | "neutral" | "negative"
  >("all");
  const allowedBrandValues = useMemo(
    () =>
      resolveAllowedValuesForPerspective(
        portalAccess,
        ["integration.brandReport", "ee-brand-report"],
        ["company", "brand", "location", "site"]
      ),
    [portalAccess]
  );
  const allowedVoiceBrandValues = useMemo(
    () =>
      resolveAllowedValuesForPerspective(
        portalAccess,
        ["integration.employeeVoice"],
        ["company", "brand", "location", "site"]
      ),
    [portalAccess]
  );
  const brandRestricted = allowedBrandValues.length > 0;
  const voiceBrandRestricted = allowedVoiceBrandValues.length > 0;
  const brandOptions = useMemo(() => {
    const all = data.brandReports.map((report) => report.selectedBrand);
    if (!brandRestricted) {
      return all;
    }
    const allowed = new Set(allowedBrandValues);
    return all.filter((value) => allowed.has(value));
  }, [data.brandReports, brandRestricted, allowedBrandValues]);
  const voiceBrandOptions = useMemo(() => {
    const all = data.meta.brands;
    if (!voiceBrandRestricted) {
      return all;
    }
    const allowed = new Set(allowedVoiceBrandValues);
    return all.filter((value) => allowed.has(value));
  }, [data.meta.brands, voiceBrandRestricted, allowedVoiceBrandValues]);
  const resolvedBrandReportSelectedBrand = brandOptions.includes(brandReportSelectedBrand)
    ? brandReportSelectedBrand
    : (brandOptions[0] ?? "");
  const resolvedVoiceSelectedBrand = voiceBrandRestricted
    ? voiceBrandOptions.includes(voiceSelectedBrand)
      ? voiceSelectedBrand
      : (voiceBrandOptions[0] ?? "")
    : voiceSelectedBrand === "all" || data.meta.brands.includes(voiceSelectedBrand)
      ? voiceSelectedBrand
      : "all";
  const perspectiveDefinitions = useMemo(() => {
    const definitions = buildIntegrationPerspectiveDefinitions(
        data,
        {
          longitudinalBrand,
          longitudinalQuestionId,
          longitudinalDepartment,
          brandReportSelectedBrand: resolvedBrandReportSelectedBrand,
          voiceSelectedBrand: resolvedVoiceSelectedBrand,
          voiceSelectedCampaign,
          voiceSelectedSentiment,
        },
        perspectiveInstances
      );
    return filterIntegrationPerspectivesForAccess(definitions, portalAccess);
  }, [
      data,
      perspectiveInstances,
      portalAccess,
      longitudinalBrand,
      longitudinalQuestionId,
      longitudinalDepartment,
      resolvedBrandReportSelectedBrand,
      resolvedVoiceSelectedBrand,
      voiceSelectedCampaign,
      voiceSelectedSentiment,
    ]);
  const categorySections = useMemo(
    () => buildIntegrationCategorySections(perspectiveDefinitions),
    [perspectiveDefinitions]
  );
  const [activeTab, setActiveTab] = useState(perspectiveDefinitions[0]?.id ?? "overview");
  const [activeCategory, setActiveCategory] = useState(categorySections[0]?.id ?? "");
  const activeCategorySection =
    categorySections.find((section) => section.id === activeCategory) ?? categorySections[0];
  const visibleTabs =
    activeCategorySection && categorySections.length > 0
      ? activeCategorySection.tabIds
          .map((id) => perspectiveDefinitions.find((tab) => tab.id === id))
          .filter((tab): tab is IntegrationPerspectiveDefinition => Boolean(tab))
      : perspectiveDefinitions;
  const resolvedActiveTabId =
    visibleTabs.find((tab) => tab.id === activeTab)?.id ?? visibleTabs[0]?.id ?? "";
  const activePerspective =
    visibleTabs.find((tab) => tab.id === resolvedActiveTabId) ?? visibleTabs[0] ?? null;
  const activeTabContent =
    activePerspective?.content ?? visibleTabs[0]?.content;
  if (perspectiveDefinitions.length === 0) {
    return (
      <div className="mx-auto max-w-[1320px] px-6 py-8">
        <Card className="border-border-strong">
          <CardContent className="px-6 py-8 text-sm text-text-secondary">
            No perspectives are assigned to this user for this dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }
  const activeLeftRail =
    activePerspective?.rendererKey === "integration.longitudinalTrends" ? (
      <IntegrationFilterRail>
        <FilterRailSection
          title="Filters"
          description="Apply one lens across the longitudinal view and keep the chart centered in the analysis canvas."
        >
          <Select
            label="Brand"
            value={longitudinalBrand}
            onChange={(event) => setLongitudinalBrand(event.target.value)}
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            <option value="all">All Brands</option>
            {data.brandReports.map((report) => (
              <option key={report.selectedBrand} value={report.selectedBrand}>
                {report.selectedBrand}
              </option>
            ))}
          </Select>
          <Select
            label="Campaign Statement"
            value={longitudinalQuestionId}
            onChange={(event) => setLongitudinalQuestionId(event.target.value)}
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            <option value="all">All Statements</option>
            {data.questionMetrics.map((question) => (
              <option key={question.id} value={question.id}>
                {question.shortLabel}
              </option>
            ))}
          </Select>
          <Select
            label="Department"
            value={longitudinalDepartment}
            onChange={(event) => setLongitudinalDepartment(event.target.value)}
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            <option value="all">All Departments</option>
            {data.departmentMetrics.map((department) => (
              <option key={department.id} value={department.label}>
                {department.label}
              </option>
            ))}
          </Select>
          <p className="text-sm leading-relaxed text-text-secondary italic">
            All selections filter the visible brand nodes through one consistent lens while the campaign cards preserve the organization-level read.
          </p>
        </FilterRailSection>
      </IntegrationFilterRail>
    ) : activePerspective?.rendererKey === "integration.brandReport" ? (
      <IntegrationFilterRail>
        <FilterRailSection
          title="Selected Brand"
          description="Use the left rail for the active brand selection instead of consuming center-canvas space."
        >
          <Select
            label="Brand"
            value={resolvedBrandReportSelectedBrand}
            onChange={(event) => setBrandReportSelectedBrand(event.target.value)}
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </Select>
          <p className="text-sm leading-relaxed text-text-secondary italic">
            Grouped cuts follow a strict 2-response masking rule, so smaller subgroups stay hidden while still contributing to valid aggregate reads.
          </p>
        </FilterRailSection>
      </IntegrationFilterRail>
    ) : activePerspective?.rendererKey === "integration.employeeVoice" ? (
      <IntegrationFilterRail>
        <FilterRailSection
          title="Filters"
          description="Apply the same comment filters across sentiment, themes, and every visible voice list."
        >
          <Select
            label="Brand"
            value={resolvedVoiceSelectedBrand}
            onChange={(event) => setVoiceSelectedBrand(event.target.value)}
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            {!voiceBrandRestricted ? <option value="all">All Brands</option> : null}
            {voiceBrandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </Select>
          <Select
            label="Campaign"
            value={voiceSelectedCampaign}
            onChange={(event) => setVoiceSelectedCampaign(event.target.value)}
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            <option value="all">All Campaigns</option>
            {data.meta.campaigns.map((campaign) => (
              <option key={campaign} value={campaign}>
                {campaign}
              </option>
            ))}
          </Select>
          <Select
            label="Sentiment"
            value={voiceSelectedSentiment}
            onChange={(event) =>
              setVoiceSelectedSentiment(
                event.target.value as "all" | "positive" | "neutral" | "negative"
              )
            }
            className="h-11 rounded-2xl border-border-strong bg-white text-sm font-semibold shadow-sm"
          >
            <option value="all">All Sentiment</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
            <option value="positive">Positive</option>
          </Select>
        </FilterRailSection>
      </IntegrationFilterRail>
    ) : undefined;

  const exportFilename = buildDashboardExportFilename({
    client: "integration",
    perspective: resolvedActiveTabId,
    campaign: data.meta.campaigns[data.meta.campaigns.length - 1],
  });

  return (
    <VisualExportProvider active client={data.meta.organizationName}>
      <VisualExportMetaSetter
        title={activePerspective?.label ?? "Integration Effectiveness"}
        filters={[data.meta.campaigns[data.meta.campaigns.length - 1]]}
      />
      <DashboardRibbon
        title="Integration Effectiveness"
        categories={
          categorySections.length > 1
            ? categorySections.map((section) => ({ id: section.id, label: section.label }))
            : []
        }
        activeCategoryId={activeCategorySection?.id}
        onCategoryChange={(nextCategoryId) => {
          const nextCategorySection =
            categorySections.find((section) => section.id === nextCategoryId) ?? categorySections[0];
          if (!nextCategorySection) {
            return;
          }
          setActiveCategory(nextCategorySection.id);
          setActiveTab(nextCategorySection.tabIds[0] ?? "");
        }}
        perspectives={visibleTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
        activePerspectiveId={resolvedActiveTabId}
        onPerspectiveChange={setActiveTab}
        legend={
          <ColorLegend
            minLabel={INTEGRATION_SCORE_SCALE.minLabel}
            maxLabel={INTEGRATION_SCORE_SCALE.maxLabel}
          />
        }
        toolbar={<CompositeVisualExportButton filename={exportFilename} />}
      />
      <div>
      <DashboardCanvas
        leftRail={activeLeftRail}
        maxWidthClassName="max-w-[1320px]"
      >
        {brandRestricted && activePerspective?.rendererKey === "integration.brandReport" && brandOptions.length === 0 ? (
          <div className="rounded-2xl border border-border-strong bg-white px-6 py-8 text-sm text-text-secondary">
            No allowed values match this user&apos;s Brand Report filter rule.
          </div>
        ) : voiceBrandRestricted &&
          activePerspective?.rendererKey === "integration.employeeVoice" &&
          voiceBrandOptions.length === 0 ? (
          <div className="rounded-2xl border border-border-strong bg-white px-6 py-8 text-sm text-text-secondary">
            No allowed values match this user&apos;s Employee Voice filter rule.
          </div>
        ) : (
          activeTabContent
        )}
      </DashboardCanvas>
      </div>
    </VisualExportProvider>
  );
}

function OverviewTab({ data }: { data: IntegrationDashboardData }) {
  const weakestQuestion = data.questionMetrics[0];
  const strongestQuestion = sortByScoreDesc(data.questionMetrics)[0];
  const lowestBrand = sortByScoreAsc(data.brandMetrics)[0];
  const highestBrand = sortByScoreDesc(data.brandMetrics)[0];
  const ovFile = (section: string) =>
    buildDashboardExportFilename({ client: "integration", perspective: `overview-${section}` });

  return (
    <div className="space-y-6">
      <RegisteredVisualExportFrame order={10} label="Download readout" filename={ovFile("readout")}>
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
      </RegisteredVisualExportFrame>

      <div className="grid gap-6 xl:grid-cols-2">
        <RegisteredVisualExportFrame order={20} label="Download card" filename={ovFile("landing")} className="h-full">
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
        </RegisteredVisualExportFrame>

        <RegisteredVisualExportFrame order={30} label="Download card" filename={ovFile("lean-in")} className="h-full">
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
        </RegisteredVisualExportFrame>
      </div>
    </div>
  );
}

function LongitudinalTrendsTab({
  data,
  selectedBrand,
  selectedQuestionId,
  selectedDepartment,
}: {
  data: IntegrationDashboardData;
  selectedBrand: string;
  selectedQuestionId: string;
  selectedDepartment: string;
}) {
  const model = useMemo(
    () =>
      buildLongitudinalCurrentStateModel(
        data,
        selectedBrand,
        selectedQuestionId,
        selectedDepartment
      ),
    [data, selectedBrand, selectedQuestionId, selectedDepartment]
  );
  const organizationSummary = model.summaryRows.find((row) => row.label === "Organization");
  const visibleSeries = model.series.filter((row) => row.label !== "Organization");
  const campaignScoreCards = [
    {
      label: "Campaign 1",
      score: organizationSummary?.campaign1 ?? null,
      isObserved: model.currentMark === "Campaign 1",
    },
    {
      label: "Campaign 2",
      score: organizationSummary?.campaign2 ?? null,
      isObserved: model.currentMark === "Campaign 2",
    },
    {
      label: "Campaign 3",
      score: organizationSummary?.campaign3 ?? null,
      isObserved: model.currentMark === "Campaign 3",
    },
  ];

  const summaryColumns = [
    {
      key: "label",
      header: "Scope",
      render: (row: LongitudinalSummaryRow) => (
        <span className="font-semibold text-text-primary">{row.label}</span>
      ),
    },
    {
      key: "campaign1",
      header: "Campaign 1",
      render: (row: LongitudinalSummaryRow) => (
        <span className="text-text-primary">
          {row.campaign1 == null ? "—" : formatScoreForDisplay(row.campaign1)}
        </span>
      ),
    },
    {
      key: "campaign2",
      header: "Campaign 2",
      render: (row: LongitudinalSummaryRow) => (
        <span className="text-text-primary">
          {row.campaign2 == null ? "—" : formatScoreForDisplay(row.campaign2)}
        </span>
      ),
    },
    {
      key: "growthToCampaign2",
      header: "Growth %",
      render: (row: LongitudinalSummaryRow) => (
        <span className="text-text-primary">{formatGrowthPercentage(row.growthToCampaign2)}</span>
      ),
    },
    {
      key: "campaign3",
      header: "Campaign 3",
      render: (row: LongitudinalSummaryRow) => (
        <span className="text-text-primary">
          {row.campaign3 == null ? "—" : formatScoreForDisplay(row.campaign3)}
        </span>
      ),
    },
    {
      key: "growthToCampaign3",
      header: "Growth %",
      render: (row: LongitudinalSummaryRow) => (
        <span className="text-text-primary">{formatGrowthPercentage(row.growthToCampaign3)}</span>
      ),
    },
  ];

  const ltFile = (section: string) =>
    buildDashboardExportFilename({ client: "integration", perspective: `longitudinal-${section}` });

  return (
    <div className="space-y-6">
      <RegisteredVisualExportFrame order={10} label="Download chart" filename={ltFile("campaign-results")}>
      <Card className="overflow-hidden border-border-strong bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/35">
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
            <div className="max-w-none">
              <HeaderTitle>Longitudinal Trends</HeaderTitle>
              <div className="mt-3">
                <p className="text-sm leading-relaxed text-text-secondary">
                  This view is structured for a three-wave integration journey and only shows campaign
                  marks that have actually been observed.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Use the left-rail filters to compare visible brands at the current campaign mark and keep the strongest pattern in view before additional waves are collected.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {campaignScoreCards.map((card) => (
                <div
                  key={card.label}
                  className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-border-strong px-4 py-3 text-center shadow-sm"
                  style={card.score == null ? { backgroundColor: "#FFFFFF" } : getScoreCardStyle(card.score)}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                    {card.label}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold leading-none text-text-primary">
                    {card.score == null ? "—" : formatScoreForDisplay(card.score)}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {card.isObserved ? "Observed org score" : "Future wave"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border-strong bg-white px-4 py-5 shadow-sm sm:px-5">
            <div className="mb-4">
              <p className="text-lg font-semibold text-text-primary">Campaign Results</p>
            </div>
            <LongitudinalNodeChart series={visibleSeries} currentMark={model.currentMark} />
          </div>
        </CardContent>
      </Card>
      </RegisteredVisualExportFrame>

      <RegisteredVisualExportFrame order={20} label="Download table" filename={ltFile("by-brand")}>
      <Card className="border-border-strong">
        <CardHeader>
          <CardTitle>Campaign Trends by Brand</CardTitle>
          <CardDescription>
            Future campaign marks remain intentionally blank until that wave is actually collected.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            columns={summaryColumns}
            data={model.summaryRows}
            emptyMessage="No longitudinal summary is available."
          />
        </CardContent>
      </Card>
      </RegisteredVisualExportFrame>
    </div>
  );
}

function PrioritiesTab({ data }: { data: IntegrationDashboardData }) {
  const [strengthItems, priorityItems] = dedupePriorityGroups(data.strengths, data.priorities);
  const visibleStrengthItems = strengthItems.slice(0, 3);
  const visiblePriorityItems = priorityItems.slice(0, 3);

  const prFile = (section: string) =>
    buildDashboardExportFilename({ client: "integration", perspective: `priorities-${section}` });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <RegisteredVisualExportFrame order={10} label="Download list" filename={prFile("strengths")} className="h-full">
          <CompactPriorityList
            title="Strength Signals"
            description="These are the clearest positive signals in the current read and the areas leaders should continue reinforcing so progress does not erode as integration continues."
            items={visibleStrengthItems}
          />
        </RegisteredVisualExportFrame>
        <RegisteredVisualExportFrame order={20} label="Download list" filename={prFile("opportunities")} className="h-full">
          <CompactPriorityList
            title="Opportunity Signals"
            description="These are the most actionable gaps in the current read and the places where focused leadership attention is most likely to improve the experience over time."
            items={visiblePriorityItems}
          />
        </RegisteredVisualExportFrame>
      </div>
    </div>
  );
}

function StatementsTab({ data }: { data: IntegrationDashboardData }) {
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

  const stFile = (section: string) =>
    buildDashboardExportFilename({ client: "integration", perspective: `statements-${section}` });

  return (
    <div className="space-y-8">
      <RegisteredVisualExportFrame order={10} label="Download card" filename={stFile("overview")}>
      <Card className="border-border-strong">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div>
            <HeaderTitle>Statement-level read</HeaderTitle>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              This perspective allows leaders to review statement trends across brand, campaign, role,
              and department so they can see where the integration story shifts most clearly.
            </p>
          </div>
          <div className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-white px-4 py-3 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Responses
            </p>
            <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">
              {data.meta.totalRespondents}
            </p>
            <p className="mt-2 text-sm text-text-secondary">Included in the current view</p>
          </div>
        </CardContent>
      </Card>
      </RegisteredVisualExportFrame>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <RegisteredVisualExportFrame order={20} label="Download chart" filename={stFile("integration-statements")} className="h-full">
          <Card className="h-full border-border-strong">
            <CardHeader>
              <CardTitle>Integration Statements</CardTitle>
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
          </RegisteredVisualExportFrame>
        </div>
        <div className="lg:col-span-5">
          <RegisteredVisualExportFrame order={30} label="Download table" filename={stFile("dimension-scores")} className="h-full">
          <ScoreTable
            title="Dimension Scores"
            headers={["Dimension", "Index"]}
            rows={dimensionRows}
            minValue={INTEGRATION_SCORE_SCALE.minValue}
            midpoint={INTEGRATION_SCORE_SCALE.midpoint}
            maxValue={INTEGRATION_SCORE_SCALE.maxValue}
          />
          </RegisteredVisualExportFrame>
        </div>
      </div>

      <RegisteredVisualExportFrame order={40} label="Download sections" filename={stFile("function-segments")}>
      <div className="border-t border-border-strong pt-8">
        <FunctionSegmentSections data={data} />
      </div>
      </RegisteredVisualExportFrame>
    </div>
  );
}

function BrandReportTab({
  data,
  selectedBrand,
}: {
  data: IntegrationDashboardData;
  selectedBrand: string;
}) {
  const brandReport =
    data.brandReports.find((report) => report.selectedBrand === selectedBrand) ?? data.brandReports[0];

  if (!brandReport) return null;

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

  const brFile = (section: string) =>
    buildDashboardExportFilename({ client: "integration", perspective: `brand-${brandReport.selectedBrand}-${section}` });

  return (
      <div className="space-y-6">
        <RegisteredVisualExportFrame order={10} label="Download summary" filename={brFile("summary")}>
        <Card className="border-border-strong">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <HeaderTitle>Brand summary</HeaderTitle>
              <h2 className="mt-2 text-4xl font-extrabold text-text-primary">{brandReport.selectedBrand}</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {buildBrandSummary(brandReport)}
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[0.8fr_1fr]">
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
                className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-border-strong bg-white px-4 py-4 text-center shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Growth %
                </p>
                <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">—</p>
                <p className="mt-2 text-sm text-text-secondary">Reserved for longitudinal brand movement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </RegisteredVisualExportFrame>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <RegisteredVisualExportFrame order={20} label="Download chart" filename={brFile("statement-scores")} className="h-full">
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
            </RegisteredVisualExportFrame>
          </div>
          <div className="space-y-4 lg:col-span-5">
            <RegisteredVisualExportFrame order={30} label="Download table" filename={brFile("departments")}>
            <ScoreTable
              title="Departments"
              headers={["Department", "Index"]}
              rows={departmentRows}
              minValue={INTEGRATION_SCORE_SCALE.minValue}
              midpoint={INTEGRATION_SCORE_SCALE.midpoint}
              maxValue={INTEGRATION_SCORE_SCALE.maxValue}
            />
            </RegisteredVisualExportFrame>
            <RegisteredVisualExportFrame order={40} label="Download table" filename={brFile("job-titles")}>
            <ScoreTable
              title="Job Titles"
              headers={["Job Title", "Index"]}
              rows={jobTitleRows}
              minValue={INTEGRATION_SCORE_SCALE.minValue}
              midpoint={INTEGRATION_SCORE_SCALE.midpoint}
              maxValue={INTEGRATION_SCORE_SCALE.maxValue}
            />
            </RegisteredVisualExportFrame>
          </div>
        </div>

        <RegisteredVisualExportFrame order={50} label="Download heat map" filename={brFile("department-heatmap")}>
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
        </RegisteredVisualExportFrame>

        <RegisteredVisualExportFrame order={60} label="Download heat map" filename={brFile("job-title-heatmap")}>
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
        </RegisteredVisualExportFrame>

        <div className="border-t border-border-strong pt-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <RegisteredVisualExportFrame order={70} label="Download list" filename={brFile("protect")} className="h-full">
              <CompactPriorityList
                title="Protect"
                description="The strongest signals worth preserving as the integration continues."
                items={protectItems}
              />
            </RegisteredVisualExportFrame>
            <RegisteredVisualExportFrame order={80} label="Download list" filename={brFile("focus")} className="h-full">
              <CompactPriorityList
                title="Focus"
                description="The clearest areas where leaders should intervene directly."
                items={focusItems}
              />
            </RegisteredVisualExportFrame>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RegisteredVisualExportFrame order={90} label="Download comments" filename={brFile("voice-improvement")} className="h-full">
            <VoiceList
              title="What this brand wants improved"
              prompt={VOICE_PROMPTS.improvement}
              entries={brandReport.voice.improvement}
            />
          </RegisteredVisualExportFrame>
          <RegisteredVisualExportFrame order={100} label="Download comments" filename={brFile("voice-strengths")} className="h-full">
            <VoiceList
              title="What this brand says is working"
              prompt={VOICE_PROMPTS.strengths}
              entries={brandReport.voice.strengths}
            />
          </RegisteredVisualExportFrame>
        </div>
      </div>
  );
}

function FunctionSegmentSections({ data }: { data: IntegrationDashboardData }) {
  return (
    <div className="space-y-8">
      <SegmentLensRow
        eyebrow="Segment 1"
        title="Campaign"
        description="Campaign shows whether the statement-level read changes across the campaign marks that have actually been collected."
        tableTitle="Campaign Breakdown"
        heatmapTitle="Campaign Heatmap"
        labelHeader="Campaign"
        rows={data.campaignMetrics}
        heatmap={data.heatmaps.campaigns}
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
    </div>
  );
}

function VoiceTab({
  data,
  selectedBrand,
  selectedCampaign,
  selectedSentiment,
}: {
  data: IntegrationDashboardData;
  selectedBrand: string;
  selectedCampaign: string;
  selectedSentiment: "all" | "positive" | "neutral" | "negative";
}) {
  const filteredVoice = useMemo(
    () => ({
      improvement: filterVoiceEntries(
        data.voice.improvement,
        selectedBrand,
        selectedCampaign,
        selectedSentiment
      ),
      strengths: filterVoiceEntries(
        data.voice.strengths,
        selectedBrand,
        selectedCampaign,
        selectedSentiment
      ),
      preserve: filterVoiceEntries(
        data.voice.preserve,
        selectedBrand,
        selectedCampaign,
        selectedSentiment
      ),
      additional: filterVoiceEntries(
        data.voice.additional,
        selectedBrand,
        selectedCampaign,
        selectedSentiment
      ),
    }),
    [data, selectedBrand, selectedCampaign, selectedSentiment]
  );
  const allFilteredVoiceEntries = useMemo(
    () => [
      ...filteredVoice.improvement,
      ...filteredVoice.strengths,
      ...filteredVoice.preserve,
      ...filteredVoice.additional,
    ],
    [filteredVoice]
  );
  const analyzableVoiceEntries = useMemo(
    () => allFilteredVoiceEntries.filter((entry) => !shouldExcludeFromVoiceAnalysis(entry.text)),
    [allFilteredVoiceEntries]
  );
  const filteredThemes = useMemo(() => buildVoiceThemes(analyzableVoiceEntries), [analyzableVoiceEntries]);
  const sentimentData = useMemo(() => buildVoiceSentiment(analyzableVoiceEntries), [analyzableVoiceEntries]);

  const themeColumns = [
    { key: "label", header: "Theme" },
    {
      key: "mentionCount",
      header: "Mentions",
      render: (row: VoiceThemeSummary) => (
        <span className="font-semibold text-text-primary">{row.mentionCount}</span>
      ),
    },
  ];

  const vcFile = (section: string) =>
    buildDashboardExportFilename({ client: "integration", perspective: `voice-${section}` });

  return (
    <div className="space-y-6">
      <RegisteredVisualExportFrame order={5} label="Download card" filename={vcFile("overview")}>
      <Card className="border-border-strong">
        <CardContent className="p-6">
          <div className="max-w-3xl">
            <HeaderTitle>Voice of the Employee</HeaderTitle>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              The written comments surface what feels credible, where the transition experience is
              breaking down, and what leaders should protect or address next.
            </p>
          </div>
        </CardContent>
      </Card>
      </RegisteredVisualExportFrame>

      <div className="grid gap-6 xl:grid-cols-2">
        <RegisteredVisualExportFrame order={10} label="Download chart" filename={vcFile("sentiment")} className="h-full">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
            <CardDescription>
              A filtered read of positive, neutral, and negative comment tone across visible entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {sentimentData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value ?? 0} comments`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {sentimentData.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-text-primary">{entry.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-text-secondary">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </RegisteredVisualExportFrame>

        <RegisteredVisualExportFrame order={20} label="Download table" filename={vcFile("themes")} className="h-full">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>Themes</CardTitle>
            <CardDescription>
              The most common filtered themes showing up across visible written comments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={themeColumns}
              data={filteredThemes}
              emptyMessage="No clear themes detected for the selected filters."
            />
          </CardContent>
        </Card>
        </RegisteredVisualExportFrame>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RegisteredVisualExportFrame order={30} label="Download comments" filename={vcFile("working-well")} className="h-full">
          <VoiceList
            title="What is working well"
            prompt={VOICE_PROMPTS.strengths}
            entries={filteredVoice.strengths}
          />
        </RegisteredVisualExportFrame>
        <RegisteredVisualExportFrame order={40} label="Download comments" filename={vcFile("do-better")} className="h-full">
          <VoiceList
            title="What is one thing Canopy could do better"
            prompt={VOICE_PROMPTS.improvement}
            entries={filteredVoice.improvement}
          />
        </RegisteredVisualExportFrame>
        <RegisteredVisualExportFrame order={50} label="Download comments" filename={vcFile("preserve")} className="h-full">
          <VoiceList
            title="What from the old way should be preserved"
            prompt={VOICE_PROMPTS.preserve}
            entries={filteredVoice.preserve}
          />
        </RegisteredVisualExportFrame>
        <RegisteredVisualExportFrame order={60} label="Download comments" filename={vcFile("additional")} className="h-full">
          <VoiceList
            title="Additional comments"
            prompt={VOICE_PROMPTS.additional}
            entries={filteredVoice.additional}
          />
        </RegisteredVisualExportFrame>
      </div>
    </div>
  );
}
