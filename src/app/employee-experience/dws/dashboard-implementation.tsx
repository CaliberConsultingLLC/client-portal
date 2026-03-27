"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, SlidersHorizontal } from "lucide-react";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { NspRadarChart } from "@/components/charts/nsp-radar-chart";
import { ColorLegend } from "@/components/collaboration/color-legend";
import {
  scoreScaleColor,
  scoreScaleTextColor,
} from "@/components/collaboration/score-color-scale";
import { ScoreTable } from "@/components/collaboration/score-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
import type {
  EmployeeExperienceDashboardData,
  EmployeeExperienceQuestionDefinition,
  EmployeeExperienceRespondent,
} from "@/types/employee-experience";

const EMPLOYEE_EXPERIENCE_SCALE = {
  minValue: 6,
  midpoint: 7.25,
  maxValue: 8.5,
  minLabel: "60",
  maxLabel: "85",
} as const;

const MODE_SECTIONS = [
  { id: "review", label: "Review", tabIds: ["investigation-hub"] },
  { id: "reports", label: "Reports", tabIds: ["department-report", "supervisor-report"] },
] as const;

const INVESTIGATION_FIELDS = [
  { id: "department", label: "Department" },
  { id: "supervisor", label: "Supervisor" },
  { id: "location", label: "Location" },
  { id: "division", label: "Division" },
  { id: "jobTitle", label: "Job Title" },
  { id: "fieldCategory", label: "Field Category" },
  { id: "leadership", label: "Leadership" },
  { id: "generation", label: "Generation" },
  { id: "rateType", label: "Rate Type" },
  { id: "tenure", label: "Tenure" },
  { id: "rating", label: "Rating" },
] as const;

type InvestigationFieldId = (typeof INVESTIGATION_FIELDS)[number]["id"];

interface DashboardProps {
  data: EmployeeExperienceDashboardData;
}

interface FilterRowState {
  id: string;
  fieldId: InvestigationFieldId | "";
  value: string;
}

interface DashboardTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface GroupComparisonRow {
  id: string;
  label: string;
  score: number;
  previousScore: number | null;
  delta: number | null;
  respondentCount: number;
  previousRespondentCount: number;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getFieldLabel(fieldId: InvestigationFieldId) {
  return INVESTIGATION_FIELDS.find((field) => field.id === fieldId)?.label ?? fieldId;
}

function getFieldValue(respondent: EmployeeExperienceRespondent, fieldId: InvestigationFieldId) {
  return respondent[fieldId];
}

function overallScore(respondents: EmployeeExperienceRespondent[], itemIds: number[]) {
  const respondentScores = respondents
    .map((respondent) => {
      const values = itemIds
        .map((itemId) => respondent.scores[itemId])
        .filter((value): value is number => value !== null);
      return values.length > 0 ? average(values) : null;
    })
    .filter((value): value is number => value !== null);

  return respondentScores.length > 0 ? round2(average(respondentScores)) : 0;
}

function questionAverage(
  respondents: EmployeeExperienceRespondent[],
  itemId: number
) {
  const values = respondents
    .map((respondent) => respondent.scores[itemId])
    .filter((value): value is number => value !== null);
  return values.length > 0 ? round2(average(values)) : 0;
}

function buildQuestionMetrics(
  questions: EmployeeExperienceQuestionDefinition[],
  currentRespondents: EmployeeExperienceRespondent[],
  comparisonRespondents: EmployeeExperienceRespondent[]
) {
  return questions
    .map((question) => {
      const score = questionAverage(currentRespondents, question.itemId);
      const previousScore =
        comparisonRespondents.length > 0 ? questionAverage(comparisonRespondents, question.itemId) : null;
      const responseCount = currentRespondents.filter(
        (respondent) => respondent.scores[question.itemId] !== null
      ).length;

      return {
        ...question,
        id: `item-${question.itemId}`,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
        responseCount,
      };
    })
    .sort((left, right) => left.score - right.score || left.itemId - right.itemId);
}

function buildDimensionMetrics(
  questions: EmployeeExperienceQuestionDefinition[],
  currentRespondents: EmployeeExperienceRespondent[],
  comparisonRespondents: EmployeeExperienceRespondent[]
) {
  const grouped = new Map<string, EmployeeExperienceQuestionDefinition[]>();

  questions.forEach((question) => {
    const existing = grouped.get(question.dimension) ?? [];
    existing.push(question);
    grouped.set(question.dimension, existing);
  });

  return Array.from(grouped.entries())
    .map(([dimension, dimensionQuestions]) => {
      const itemIds = dimensionQuestions.map((question) => question.itemId);
      const score = overallScore(currentRespondents, itemIds);
      const previousScore =
        comparisonRespondents.length > 0 ? overallScore(comparisonRespondents, itemIds) : null;

      return {
        id: dimension.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label: dimension,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
      };
    })
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

function buildGroupComparisonRows(
  fieldId: InvestigationFieldId,
  currentRespondents: EmployeeExperienceRespondent[],
  comparisonRespondents: EmployeeExperienceRespondent[],
  questions: EmployeeExperienceQuestionDefinition[],
  minimumSegmentSize: number
): GroupComparisonRow[] {
  const itemIds = questions.map((question) => question.itemId);
  const currentGroups = new Map<string, EmployeeExperienceRespondent[]>();
  const comparisonGroups = new Map<string, EmployeeExperienceRespondent[]>();

  currentRespondents.forEach((respondent) => {
    const label = getFieldValue(respondent, fieldId);
    const existing = currentGroups.get(label) ?? [];
    existing.push(respondent);
    currentGroups.set(label, existing);
  });

  comparisonRespondents.forEach((respondent) => {
    const label = getFieldValue(respondent, fieldId);
    const existing = comparisonGroups.get(label) ?? [];
    existing.push(respondent);
    comparisonGroups.set(label, existing);
  });

  return Array.from(currentGroups.entries())
    .filter(([, respondents]) => respondents.length >= minimumSegmentSize)
    .map(([label, respondents]) => {
      const comparisonGroup = comparisonGroups.get(label) ?? [];
      const comparisonValid = comparisonGroup.length >= minimumSegmentSize;
      const score = overallScore(respondents, itemIds);
      const previousScore = comparisonValid ? overallScore(comparisonGroup, itemIds) : null;

      return {
        id: `${fieldId}-${label}`,
        label,
        score,
        previousScore,
        delta: previousScore === null ? null : round2(score - previousScore),
        respondentCount: respondents.length,
        previousRespondentCount: comparisonValid ? comparisonGroup.length : 0,
      };
    })
    .sort((left, right) => right.respondentCount - left.respondentCount || right.score - left.score);
}

function applyFilters(
  respondents: EmployeeExperienceRespondent[],
  filters: FilterRowState[]
) {
  return respondents.filter((respondent) =>
    filters.every((filter) => {
      if (!filter.fieldId || !filter.value) return true;
      return getFieldValue(respondent, filter.fieldId) === filter.value;
    })
  );
}

function getScoreCardStyle(score: number) {
  return {
    backgroundColor: scoreScaleColor(
      score,
      EMPLOYEE_EXPERIENCE_SCALE.minValue,
      EMPLOYEE_EXPERIENCE_SCALE.midpoint,
      EMPLOYEE_EXPERIENCE_SCALE.maxValue
    ),
    color: scoreScaleTextColor(
      score,
      EMPLOYEE_EXPERIENCE_SCALE.midpoint,
      0.8,
      EMPLOYEE_EXPERIENCE_SCALE.minValue,
      EMPLOYEE_EXPERIENCE_SCALE.maxValue
    ),
  };
}

function HeaderTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{children}</p>;
}

function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF3F6] px-2.5 py-1 text-xs font-semibold text-[#60727D]">
        <Minus className="h-3.5 w-3.5" />
        No comparison
      </span>
    );
  }

  if (Math.abs(delta) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF3F6] px-2.5 py-1 text-xs font-semibold text-[#60727D]">
        <Minus className="h-3.5 w-3.5" />
        Flat
      </span>
    );
  }

  const positive = delta > 0;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        positive ? "bg-[#E7F2EB] text-[#24613A]" : "bg-[#F8E7E5] text-[#8A3D36]"
      }`}
    >
      {positive ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {positive ? "+" : ""}
      {formatScoreForDisplay(delta)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  score,
}: {
  label: string;
  value: string | number;
  subtext: string;
  score?: number;
}) {
  return (
    <div
      className="flex min-h-[132px] flex-col justify-center rounded-2xl border border-border-strong px-4 py-4 shadow-sm"
      style={typeof score === "number" ? getScoreCardStyle(score) : undefined}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">{label}</p>
      <p className="mt-2 text-4xl font-extrabold leading-none text-text-primary">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{subtext}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-border-strong">
      <CardContent className="px-6 py-12 text-center text-sm text-text-muted">{message}</CardContent>
    </Card>
  );
}

function ReviewHubTab({
  data,
  currentCampaign,
  comparisonCampaign,
}: {
  data: EmployeeExperienceDashboardData;
  currentCampaign: string;
  comparisonCampaign: string;
}) {
  const minimumSegmentSize = data.settings.minimumSegmentSize;
  const [primaryAngle, setPrimaryAngle] = useState<InvestigationFieldId>("department");
  const [filters, setFilters] = useState<FilterRowState[]>([
    { id: "filter-1", fieldId: "", value: "" },
    { id: "filter-2", fieldId: "", value: "" },
    { id: "filter-3", fieldId: "", value: "" },
  ]);

  const currentCampaignRespondents = useMemo(
    () => data.respondents.filter((respondent) => respondent.campaignLabel === currentCampaign),
    [data.respondents, currentCampaign]
  );
  const comparisonCampaignRespondents = useMemo(
    () =>
      comparisonCampaign
        ? data.respondents.filter((respondent) => respondent.campaignLabel === comparisonCampaign)
        : [],
    [data.respondents, comparisonCampaign]
  );

  const currentFilteredRespondents = useMemo(
    () => applyFilters(currentCampaignRespondents, filters),
    [currentCampaignRespondents, filters]
  );
  const comparisonFilteredRespondents = useMemo(
    () => applyFilters(comparisonCampaignRespondents, filters),
    [comparisonCampaignRespondents, filters]
  );

  const currentOverviewScore = useMemo(
    () => overallScore(currentFilteredRespondents, data.questions.map((question) => question.itemId)),
    [currentFilteredRespondents, data.questions]
  );
  const comparisonOverviewScore = useMemo(
    () =>
      comparisonFilteredRespondents.length > 0
        ? overallScore(comparisonFilteredRespondents, data.questions.map((question) => question.itemId))
        : null,
    [comparisonFilteredRespondents, data.questions]
  );

  const dimensionMetrics = useMemo(
    () => buildDimensionMetrics(data.questions, currentFilteredRespondents, comparisonFilteredRespondents),
    [data.questions, currentFilteredRespondents, comparisonFilteredRespondents]
  );
  const questionMetrics = useMemo(
    () => buildQuestionMetrics(data.questions, currentFilteredRespondents, comparisonFilteredRespondents),
    [data.questions, currentFilteredRespondents, comparisonFilteredRespondents]
  );
  const primaryAngleRows = useMemo(
    () =>
      buildGroupComparisonRows(
        primaryAngle,
        currentFilteredRespondents,
        comparisonFilteredRespondents,
        data.questions,
        minimumSegmentSize
      ),
    [
      primaryAngle,
      currentFilteredRespondents,
      comparisonFilteredRespondents,
      data.questions,
      minimumSegmentSize,
    ]
  );

  const otherAngleRows = useMemo(
    () =>
      INVESTIGATION_FIELDS.filter((field) => field.id !== primaryAngle)
        .map((field) => ({
          field,
          rows: buildGroupComparisonRows(
            field.id,
            currentFilteredRespondents,
            comparisonFilteredRespondents,
            data.questions,
            minimumSegmentSize
          ),
        }))
        .filter((entry) => entry.rows.length > 0)
        .slice(0, 3),
    [
      primaryAngle,
      currentFilteredRespondents,
      comparisonFilteredRespondents,
      data.questions,
      minimumSegmentSize,
    ]
  );

  const filterValueOptions = useMemo(() => {
    return filters.map((filter, index) => {
      if (!filter.fieldId) return [];

      const otherFilters = filters.filter((candidate, candidateIndex) => candidateIndex !== index);
      const eligibleRespondents = applyFilters(currentCampaignRespondents, otherFilters);
      const counts = new Map<string, number>();

      eligibleRespondents.forEach((respondent) => {
        const value = getFieldValue(respondent, filter.fieldId as InvestigationFieldId);
        counts.set(value, (counts.get(value) ?? 0) + 1);
      });

      return Array.from(counts.entries())
        .filter(([, count]) => count >= minimumSegmentSize)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([value, count]) => ({ value, count }));
    });
  }, [filters, currentCampaignRespondents, minimumSegmentSize]);

  const comparisonRowsForTable = primaryAngleRows
    .slice()
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.respondentCount - left.respondentCount ||
        left.label.localeCompare(right.label)
    )
    .slice(0, 12);

  const comparisonColumns = [
    { key: "label", header: getFieldLabel(primaryAngle) },
    {
      key: "score",
      header: currentCampaign,
      render: (row: GroupComparisonRow) => (
        <span className="font-semibold text-text-primary">{formatScoreForDisplay(row.score)}</span>
      ),
    },
    {
      key: "previousScore",
      header: comparisonCampaign || "Comparison",
      render: (row: GroupComparisonRow) => (
        <span className="font-semibold text-text-primary">
          {row.previousScore === null ? "—" : formatScoreForDisplay(row.previousScore)}
        </span>
      ),
    },
    {
      key: "delta",
      header: "Delta",
      render: (row: GroupComparisonRow) => <DeltaIndicator delta={row.delta} />,
    },
    {
      key: "respondentCount",
      header: "Responses",
      render: (row: GroupComparisonRow) => (
        <span className="text-text-secondary">{row.respondentCount}</span>
      ),
    },
  ];

  if (currentFilteredRespondents.length < minimumSegmentSize) {
    return (
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <FilterPane
          currentCampaign={currentCampaign}
          minimumSegmentSize={minimumSegmentSize}
          primaryAngle={primaryAngle}
          setPrimaryAngle={setPrimaryAngle}
          filters={filters}
          setFilters={setFilters}
          filterValueOptions={filterValueOptions}
        />
        <EmptyState message="The active filter combination falls below the Rule of 3. Broaden the filters or choose a different angle to continue." />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <FilterPane
        currentCampaign={currentCampaign}
        minimumSegmentSize={minimumSegmentSize}
        primaryAngle={primaryAngle}
        setPrimaryAngle={setPrimaryAngle}
        filters={filters}
        setFilters={setFilters}
        filterValueOptions={filterValueOptions}
      />

      <div className="space-y-6">
        <Card className="overflow-hidden border-border-strong bg-gradient-to-br from-white via-surface-2 to-nsp-blue-50/40">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <HeaderTitle>Investigation Hub</HeaderTitle>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary">
                {getFieldLabel(primaryAngle)} is the primary lens for this cut.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">
                This page is designed to be the one-page executive and analyst workbench. Choose a
                campaign, set a comparison campaign, lock in a primary angle, and then layer filters to
                interrogate the data without breaking the Rule of 3.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <MetricCard
                label="Experience Index"
                value={formatScoreForDisplay(currentOverviewScore)}
                subtext={`Filtered current campaign: ${currentCampaign}`}
                score={currentOverviewScore}
              />
              <MetricCard
                label="Filtered Responses"
                value={currentFilteredRespondents.length}
                subtext="Current-campaign respondents in this view"
              />
              <MetricCard
                label="Comparative Index"
                value={
                  comparisonOverviewScore === null
                    ? "—"
                    : formatScoreForDisplay(comparisonOverviewScore)
                }
                subtext={comparisonCampaign ? `Comparison campaign: ${comparisonCampaign}` : "No comparison campaign selected"}
                score={comparisonOverviewScore ?? undefined}
              />
              <MetricCard
                label="Visible Segments"
                value={primaryAngleRows.length}
                subtext={`Primary-angle groups meeting the Rule of ${minimumSegmentSize}`}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <Card className="border-border-strong">
            <CardHeader>
              <CardTitle>{getFieldLabel(primaryAngle)} Comparison</CardTitle>
              <CardDescription>
                Current-campaign ranking for the selected angle, restricted to groups that pass the Rule
                of {minimumSegmentSize}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <GradientBarChart
                data={comparisonRowsForTable.map((row) => ({
                  name: row.label,
                  value: row.score,
                }))}
                average={currentOverviewScore}
                minValue={EMPLOYEE_EXPERIENCE_SCALE.minValue}
                midpoint={EMPLOYEE_EXPERIENCE_SCALE.midpoint}
                maxValue={EMPLOYEE_EXPERIENCE_SCALE.maxValue}
                height={Math.max(360, comparisonRowsForTable.length * 34)}
              />
            </CardContent>
          </Card>

          <Card className="border-border-strong">
            <CardHeader>
              <CardTitle>One-to-One Comparison</CardTitle>
              <CardDescription>
                Current and comparative campaign average scores side by side for the selected angle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={comparisonColumns}
                data={comparisonRowsForTable}
                emptyMessage="No primary-angle groups meet the rule of 3 under the current filters."
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="border-border-strong">
            <CardHeader>
              <CardTitle>Dimension Profile</CardTitle>
              <CardDescription>
                Current filtered cut against the selected comparative campaign.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <NspRadarChart
                data={dimensionMetrics.map((dimension) => ({
                  dimension: dimension.label,
                  value: dimension.score,
                  benchmark: dimension.previousScore ?? dimension.score,
                }))}
                maxValue={100}
                showBenchmark
                height={320}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <ScoreTable
              title="Dimension Averages"
              headers={["Dimension", "Avg"]}
              rows={dimensionMetrics.map((dimension) => ({
                label: dimension.label,
                score: dimension.score,
              }))}
              minValue={EMPLOYEE_EXPERIENCE_SCALE.minValue}
              midpoint={EMPLOYEE_EXPERIENCE_SCALE.midpoint}
              maxValue={EMPLOYEE_EXPERIENCE_SCALE.maxValue}
            />

            <Card className="border-border-strong">
              <CardHeader>
                <CardTitle>Statement Pressure Points</CardTitle>
                <CardDescription>The strongest and weakest statements in the current filtered cut.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <MiniInsightCard
                  label="Strongest"
                  title={questionMetrics.at(-1)?.dimension ?? "No signal"}
                  body={questionMetrics.at(-1)?.statement ?? "No signal available."}
                  score={questionMetrics.at(-1)?.score ?? EMPLOYEE_EXPERIENCE_SCALE.maxValue}
                />
                <MiniInsightCard
                  label="Weakest"
                  title={questionMetrics[0]?.dimension ?? "No signal"}
                  body={questionMetrics[0]?.statement ?? "No signal available."}
                  score={questionMetrics[0]?.score ?? EMPLOYEE_EXPERIENCE_SCALE.minValue}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <HeaderTitle>Other Angles</HeaderTitle>
          <div className="grid gap-6 xl:grid-cols-3">
            {otherAngleRows.map((entry) => (
              <ScoreTable
                key={entry.field.id}
                title={`${entry.field.label} Snapshot`}
                headers={[entry.field.label, "Avg"]}
                rows={entry.rows.slice(0, 8).map((row) => ({
                  label: `${row.label} (${row.respondentCount})`,
                  score: row.score,
                }))}
                minValue={EMPLOYEE_EXPERIENCE_SCALE.minValue}
                midpoint={EMPLOYEE_EXPERIENCE_SCALE.midpoint}
                maxValue={EMPLOYEE_EXPERIENCE_SCALE.maxValue}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPane({
  currentCampaign,
  minimumSegmentSize,
  primaryAngle,
  setPrimaryAngle,
  filters,
  setFilters,
  filterValueOptions,
}: {
  currentCampaign: string;
  minimumSegmentSize: number;
  primaryAngle: InvestigationFieldId;
  setPrimaryAngle: (value: InvestigationFieldId) => void;
  filters: FilterRowState[];
  setFilters: React.Dispatch<React.SetStateAction<FilterRowState[]>>;
  filterValueOptions: Array<Array<{ value: string; count: number }>>;
}) {
  return (
    <div className="xl:sticky xl:top-4 xl:self-start">
      <Card className="border-border-strong">
        <CardHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <CardTitle className="pt-4">Investigation Controls</CardTitle>
          <CardDescription>
            This pane stays locked to the left so filtering stays simple while the analysis canvas stays
            readable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl bg-surface-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Current campaign
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{currentCampaign}</p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Primary angle
            </label>
            <select
              value={primaryAngle}
              onChange={(event) => setPrimaryAngle(event.target.value as InvestigationFieldId)}
              className="mt-2 w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm focus:border-nsp-blue-300 focus:outline-none"
            >
              {INVESTIGATION_FIELDS.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {filters.map((filter, index) => (
            <div key={filter.id} className="space-y-2 rounded-2xl border border-border-strong bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Filter {index + 1}
              </p>
              <select
                value={filter.fieldId}
                onChange={(event) => {
                  const nextField = event.target.value as InvestigationFieldId | "";
                  setFilters((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, fieldId: nextField, value: "" } : entry
                    )
                  );
                }}
                className="w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none"
              >
                <option value="">No filter</option>
                {INVESTIGATION_FIELDS.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                value={filter.value}
                disabled={!filter.fieldId}
                onChange={(event) =>
                  setFilters((current) =>
                    current.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, value: event.target.value } : entry
                    )
                  )
                }
                className="w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm text-text-primary focus:border-nsp-blue-300 focus:outline-none disabled:bg-surface-2 disabled:text-text-muted"
              >
                <option value="">Any value</option>
                {filterValueOptions[index]?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setFilters((current) =>
                current.map((filter) => ({
                  ...filter,
                  fieldId: "",
                  value: "",
                }))
              )
            }
            className="w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-2"
          >
            Reset filters
          </button>

          <div className="rounded-2xl bg-[#EEF3F6] px-4 py-4 text-sm text-[#60727D]">
            Rule of {minimumSegmentSize}: any slice that does not meet at least {minimumSegmentSize} responses
            is hidden from view.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniInsightCard({
  label,
  title,
  body,
  score,
}: {
  label: string;
  title: string;
  body: string;
  score: number;
}) {
  return (
    <div className="rounded-2xl px-4 py-4" style={getScoreCardStyle(score)}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">{label}</p>
      <p className="mt-2 font-semibold text-text-primary">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}

function ReportsTab({
  data,
  currentCampaign,
  comparisonCampaign,
  fieldId,
  title,
  description,
  listLabel,
  reportFilterFields,
}: {
  data: EmployeeExperienceDashboardData;
  currentCampaign: string;
  comparisonCampaign: string;
  fieldId: InvestigationFieldId;
  title: string;
  description: string;
  listLabel: string;
  reportFilterFields: InvestigationFieldId[];
}) {
  const minimumSegmentSize = data.settings.minimumSegmentSize;
  const [selectedValue, setSelectedValue] = useState("");
  const [reportFilters, setReportFilters] = useState<FilterRowState[]>(
    reportFilterFields.map((filterField, index) => ({
      id: `${fieldId}-report-filter-${index}`,
      fieldId: filterField,
      value: "",
    }))
  );

  const currentCampaignRespondents = useMemo(
    () => data.respondents.filter((respondent) => respondent.campaignLabel === currentCampaign),
    [data.respondents, currentCampaign]
  );
  const comparisonCampaignRespondents = useMemo(
    () =>
      comparisonCampaign
        ? data.respondents.filter((respondent) => respondent.campaignLabel === comparisonCampaign)
        : [],
    [data.respondents, comparisonCampaign]
  );

  const currentFilteredRespondents = useMemo(
    () => applyFilters(currentCampaignRespondents, reportFilters),
    [currentCampaignRespondents, reportFilters]
  );
  const comparisonFilteredRespondents = useMemo(
    () => applyFilters(comparisonCampaignRespondents, reportFilters),
    [comparisonCampaignRespondents, reportFilters]
  );

  const rows = useMemo(
    () =>
      buildGroupComparisonRows(
        fieldId,
        currentFilteredRespondents,
        comparisonFilteredRespondents,
        data.questions,
        minimumSegmentSize
      ).sort((left, right) => right.score - left.score || right.respondentCount - left.respondentCount),
    [
      fieldId,
      currentFilteredRespondents,
      comparisonFilteredRespondents,
      data.questions,
      minimumSegmentSize,
    ]
  );

  const selectedGroup = selectedValue ? rows.find((row) => row.label === selectedValue) ?? rows[0] : rows[0];
  const selectedCurrentRespondents = useMemo(
    () =>
      selectedGroup
        ? currentFilteredRespondents.filter((respondent) => getFieldValue(respondent, fieldId) === selectedGroup.label)
        : [],
    [selectedGroup, currentFilteredRespondents, fieldId]
  );
  const selectedComparisonRespondents = useMemo(
    () =>
      selectedGroup
        ? comparisonFilteredRespondents.filter((respondent) => getFieldValue(respondent, fieldId) === selectedGroup.label)
        : [],
    [selectedGroup, comparisonFilteredRespondents, fieldId]
  );

  const questionMetrics = useMemo(
    () => buildQuestionMetrics(data.questions, selectedCurrentRespondents, selectedComparisonRespondents),
    [data.questions, selectedCurrentRespondents, selectedComparisonRespondents]
  );
  const dimensionMetrics = useMemo(
    () => buildDimensionMetrics(data.questions, selectedCurrentRespondents, selectedComparisonRespondents),
    [data.questions, selectedCurrentRespondents, selectedComparisonRespondents]
  );

  const reportFilterOptions = useMemo(() => {
    return reportFilters.map((filter) => {
      const counts = new Map<string, number>();
      currentCampaignRespondents.forEach((respondent) => {
        const value = getFieldValue(respondent, filter.fieldId as InvestigationFieldId);
        counts.set(value, (counts.get(value) ?? 0) + 1);
      });

      return Array.from(counts.entries())
        .filter(([, count]) => count >= minimumSegmentSize)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([value, count]) => ({ value, count }));
    });
  }, [reportFilters, currentCampaignRespondents, minimumSegmentSize]);

  if (rows.length === 0) {
    return (
      <EmptyState message={`No ${listLabel.toLowerCase()} groups meet the Rule of ${minimumSegmentSize} under the current campaign and filter selection.`} />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border-strong">
        <CardContent className="flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <HeaderTitle>{title}</HeaderTitle>
            <h2 className="mt-2 text-3xl font-extrabold text-text-primary">{description}</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {reportFilters.map((filter, index) => (
              <div key={filter.id}>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {getFieldLabel(filter.fieldId as InvestigationFieldId)}
                </label>
                <select
                  value={filter.value}
                  onChange={(event) =>
                    setReportFilters((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, value: event.target.value } : entry
                      )
                    )
                  }
                  className="mt-2 min-w-[180px] rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm text-text-primary shadow-sm focus:border-nsp-blue-300 focus:outline-none"
                >
                  <option value="">All {getFieldLabel(filter.fieldId as InvestigationFieldId)}</option>
                  {reportFilterOptions[index]?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="border-border-strong">
          <CardHeader>
            <CardTitle>{listLabel}</CardTitle>
            <CardDescription>
              Select a {listLabel.toLowerCase().slice(0, -1)} to open the report view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              value={selectedGroup?.label ?? ""}
              onChange={(event) => setSelectedValue(event.target.value)}
              className="w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm focus:border-nsp-blue-300 focus:outline-none"
            >
              {rows.map((row) => (
                <option key={row.id} value={row.label}>
                  {row.label}
                </option>
              ))}
            </select>

            <ScoreTable
              title={`${title} Ranking`}
              headers={[listLabel.slice(0, -1), "Avg"]}
              rows={rows.slice(0, 18).map((row) => ({
                label: `${row.label} (${row.respondentCount})`,
                score: row.score,
              }))}
              minValue={EMPLOYEE_EXPERIENCE_SCALE.minValue}
              midpoint={EMPLOYEE_EXPERIENCE_SCALE.midpoint}
              maxValue={EMPLOYEE_EXPERIENCE_SCALE.maxValue}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border-strong">
            <CardContent className="grid gap-4 p-6 lg:grid-cols-[1fr_220px_220px]">
              <div>
                <HeaderTitle>{title}</HeaderTitle>
                <h3 className="mt-2 text-3xl font-extrabold text-text-primary">
                  {selectedGroup?.label ?? "No selection"}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
                  Campaign-first reporting keeps each survey wave separate while still allowing a direct
                  one-to-one comparison when the same cut exists in the selected comparative campaign.
                </p>
              </div>
              <MetricCard
                label="Current Average"
                value={selectedGroup ? formatScoreForDisplay(selectedGroup.score) : "—"}
                subtext={`Current campaign: ${currentCampaign}`}
                score={selectedGroup?.score}
              />
              <MetricCard
                label="Comparative Average"
                value={
                  selectedGroup?.previousScore === null || selectedGroup?.previousScore === undefined
                    ? "—"
                    : formatScoreForDisplay(selectedGroup.previousScore)
                }
                subtext={
                  comparisonCampaign ? `Comparison campaign: ${comparisonCampaign}` : "No comparison selected"
                }
                score={selectedGroup?.previousScore ?? undefined}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <Card className="border-border-strong">
              <CardHeader>
                <CardTitle>{title} Statement Breakdown</CardTitle>
                <CardDescription>Higher is stronger within the selected cut.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <GradientBarChart
                  data={questionMetrics
                    .slice()
                    .sort((left, right) => right.score - left.score)
                    .map((question) => ({
                      name: question.statement,
                      value: question.score,
                    }))}
                  average={selectedGroup?.score}
                  minValue={EMPLOYEE_EXPERIENCE_SCALE.minValue}
                  midpoint={EMPLOYEE_EXPERIENCE_SCALE.midpoint}
                  maxValue={EMPLOYEE_EXPERIENCE_SCALE.maxValue}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border-strong">
                <CardHeader>
                  <CardTitle>Dimension Profile</CardTitle>
                  <CardDescription>Current campaign against the comparative campaign.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <NspRadarChart
                    data={dimensionMetrics.map((dimension) => ({
                      dimension: dimension.label,
                      value: dimension.score,
                      benchmark: dimension.previousScore ?? dimension.score,
                    }))}
                    maxValue={100}
                    showBenchmark
                    height={300}
                  />
                </CardContent>
              </Card>

              <ScoreTable
                title="Dimension Averages"
                headers={["Dimension", "Avg"]}
                rows={dimensionMetrics.map((dimension) => ({
                  label: dimension.label,
                  score: dimension.score,
                }))}
                minValue={EMPLOYEE_EXPERIENCE_SCALE.minValue}
                midpoint={EMPLOYEE_EXPERIENCE_SCALE.midpoint}
                maxValue={EMPLOYEE_EXPERIENCE_SCALE.maxValue}
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <MiniInsightCard
              label="Strongest statement"
              title={questionMetrics.at(-1)?.dimension ?? "No signal"}
              body={questionMetrics.at(-1)?.statement ?? "No statement available."}
              score={questionMetrics.at(-1)?.score ?? EMPLOYEE_EXPERIENCE_SCALE.maxValue}
            />
            <MiniInsightCard
              label="Weakest statement"
              title={questionMetrics[0]?.dimension ?? "No signal"}
              body={questionMetrics[0]?.statement ?? "No statement available."}
              score={questionMetrics[0]?.score ?? EMPLOYEE_EXPERIENCE_SCALE.minValue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DwsEmployeeExperienceDashboardClient({ data }: DashboardProps) {
  const [activeMode, setActiveMode] = useState<(typeof MODE_SECTIONS)[number]["id"]>("review");
  const [activeTab, setActiveTab] = useState("investigation-hub");
  const [currentCampaign, setCurrentCampaign] = useState(data.meta.currentCampaignLabel);
  const [comparisonCampaign, setComparisonCampaign] = useState(data.meta.priorCampaignLabel ?? "");

  const activeModeSection = MODE_SECTIONS.find((section) => section.id === activeMode) ?? MODE_SECTIONS[0];

  const tabs: DashboardTab[] = [
    {
      id: "investigation-hub",
      label: "Investigation Hub",
      content: (
        <ReviewHubTab
          data={data}
          currentCampaign={currentCampaign}
          comparisonCampaign={comparisonCampaign}
        />
      ),
    },
    {
      id: "department-report",
      label: "Department Report",
      content: (
        <ReportsTab
          data={data}
          currentCampaign={currentCampaign}
          comparisonCampaign={comparisonCampaign}
          fieldId="department"
          title="Department Report"
          description="Sortable and filterable department-level reporting for leaders."
          listLabel="Departments"
          reportFilterFields={["location", "division"]}
        />
      ),
    },
    {
      id: "supervisor-report",
      label: "Supervisor Report",
      content: (
        <ReportsTab
          data={data}
          currentCampaign={currentCampaign}
          comparisonCampaign={comparisonCampaign}
          fieldId="supervisor"
          title="Supervisor Report"
          description="Sortable and filterable supervisor-level reporting for leadership review."
          listLabel="Supervisors"
          reportFilterFields={["location", "division", "department"]}
        />
      ),
    },
  ];

  const visibleTabs = activeModeSection.tabIds
    .map((id) => tabs.find((tab) => tab.id === id))
    .filter((tab): tab is DashboardTab => Boolean(tab));
  const resolvedActiveTabId =
    visibleTabs.find((tab) => tab.id === activeTab)?.id ?? visibleTabs[0]?.id ?? "";
  const activeTabContent =
    visibleTabs.find((tab) => tab.id === resolvedActiveTabId)?.content ?? visibleTabs[0]?.content ?? null;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-border-strong bg-white shadow-sm">
        <header className="relative flex flex-wrap items-start justify-between gap-6 px-5 py-5 pr-5 xl:pr-[380px]">
          <div className="flex items-center gap-5">
            <div className="flex h-28 w-44 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-[#102F4A] shadow-sm">
              <div className="text-center text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#E8CC70]">Client</p>
                <p className="mt-2 text-4xl font-extrabold tracking-[0.12em]">DWS</p>
              </div>
            </div>
            <div className="max-w-4xl">
              <h1 className="font-serif text-3xl font-bold text-text-primary">
                Employee Experience Dashboard - Deep Well Services
              </h1>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                Campaign-first employee experience analytics
              </p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Each campaign stands on its own. This dashboard keeps survey waves separate by default,
                then lets leaders compare them longitudinally through an explicit current-versus-comparative
                lens.
              </p>
            </div>
          </div>

          <div className="w-full xl:absolute xl:right-5 xl:top-5 xl:w-[340px]">
            <div className="rounded-[26px] border border-border-strong bg-[#F7FAFC]/96 p-4 shadow-sm backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Current campaign
                  </label>
                  <select
                    value={currentCampaign}
                    onChange={(event) => setCurrentCampaign(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm focus:border-nsp-blue-300 focus:outline-none"
                  >
                    {data.meta.campaigns.map((campaign) => (
                      <option key={campaign} value={campaign}>
                        {campaign}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Comparative campaign
                  </label>
                  <select
                    value={comparisonCampaign}
                    onChange={(event) => setComparisonCampaign(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border-strong bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm focus:border-nsp-blue-300 focus:outline-none"
                  >
                    <option value="">No comparison</option>
                    {data.meta.campaigns
                      .filter((campaign) => campaign !== currentCampaign)
                      .map((campaign) => (
                        <option key={campaign} value={campaign}>
                          {campaign}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 border-t border-border-strong pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Score guide
                </p>
                <ColorLegend
                  className="mt-2"
                  minLabel={EMPLOYEE_EXPERIENCE_SCALE.minLabel}
                  maxLabel={EMPLOYEE_EXPERIENCE_SCALE.maxLabel}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-t border-border-strong bg-surface-3/90 px-3 py-2.5">
          <div className="flex shrink-0 items-center gap-2">
            {MODE_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveMode(section.id);
                  setActiveTab(section.tabIds[0] ?? "");
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                  activeModeSection.id === section.id
                    ? "bg-nsp-blue-500 text-white shadow-sm"
                    : "border border-border-strong bg-white text-text-secondary hover:border-nsp-blue-200 hover:text-text-primary"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="h-8 w-px shrink-0 bg-border-strong" />
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                  resolvedActiveTabId === tab.id
                    ? "bg-nsp-blue-500 text-white shadow-sm"
                    : "text-text-secondary hover:bg-white hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="min-h-[700px]">{activeTabContent}</div>
    </div>
  );
}
