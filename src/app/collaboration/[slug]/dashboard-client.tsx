"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { GradientBarChart } from "@/components/charts/gradient-bar-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { ScoreTable } from "@/components/collaboration/score-table";
import { ColorLegend } from "@/components/collaboration/color-legend";

import type { CollaborationData } from "@/types/collaboration";

// ── Tab definitions ─────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "cdrs", label: "Cross-Department Relational Strength" },
  { id: "ci", label: "Collaboration Index" },
  { id: "heatmap", label: "Department Heatmap" },
  { id: "dept", label: "Department Report" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface DashboardProps {
  data: CollaborationData;
  campaignName: string;
  organizationName: string;
}

// ════════════════════════════════════════════════════════════
//  Main Dashboard Component
// ════════════════════════════════════════════════════════════
export function CollaborationDashboardClient({
  data,
  campaignName,
  organizationName,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-border-default bg-white px-5 py-5 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border-default bg-surface-2 p-2 shadow-sm">
            <Image
              src="/CollabLogo.png"
              alt="Collaboration dashboard logo"
              fill
              sizes="112px"
              className="object-contain p-2"
              priority
            />
          </div>
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-nsp-blue-600">
              Collaboration Analytics
            </p>
            <h1 className="font-serif text-2xl font-bold text-text-primary">
              {campaignName}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {organizationName
                ? `${organizationName} — `
                : ""}
              Cross-Department Relational Strength &amp; Collaboration Analytics
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Score Guide
          </p>
          <ColorLegend />
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border-default bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-nsp-blue-500 text-white shadow-sm"
                : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="min-h-[600px]">
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "cdrs" && <CdrsTab data={data} />}
        {activeTab === "ci" && <CiTab data={data} />}
        {activeTab === "heatmap" && <HeatmapTab data={data} />}
        {activeTab === "dept" && <DeptTab data={data} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 1: Overview
// ════════════════════════════════════════════════════════════
function OverviewTab({ data }: { data: CollaborationData }) {
  const incomingData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.incomingCDRS - a.incomingCDRS)
    .map((d) => ({ name: d.department, value: d.incomingCDRS }));

  const outgoingData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.outgoingCDRS - a.outgoingCDRS)
    .map((d) => ({ label: d.department, score: d.outgoingCDRS }));

  const ciData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.collaborationIndex - a.collaborationIndex)
    .map((d) => ({ name: d.department, value: d.collaborationIndex }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Incoming CDRS */}
      <Card title="Incoming CDRS" subtitle="How others rate each department">
        <GradientBarChart
          data={incomingData}
          average={data.meta.dwsAverageIncoming}
        />
        <p className="mt-2 text-center text-xs text-text-muted">
          Average: {data.meta.dwsAverageIncoming.toFixed(2)}
        </p>
      </Card>

      {/* Outgoing CDRS */}
      <ScoreTable
        title="Outgoing CDRS"
        headers={["Dept", "Score"]}
        rows={outgoingData}
        className="h-fit"
      />

      {/* Collaboration Index */}
      <Card title="Collaboration Index" subtitle="Deeper department-specific measure">
        <GradientBarChart
          data={ciData}
          average={data.meta.dwsAverageOverall}
        />
        <p className="mt-2 text-center text-xs text-text-muted">
          Average: {data.meta.dwsAverageOverall.toFixed(1)}
        </p>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 2: Cross-Department Relational Strength
// ════════════════════════════════════════════════════════════
function CdrsTab({ data }: { data: CollaborationData }) {
  const incomingData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.incomingCDRS - a.incomingCDRS)
    .map((d) => ({ name: d.department, value: d.incomingCDRS }));

  const outgoingData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.outgoingCDRS - a.outgoingCDRS)
    .map((d) => ({ label: d.department, score: d.outgoingCDRS }));

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: Overview text */}
      <div className="lg:col-span-3">
        <Card>
          <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-blue-300 underline-offset-4">
            Overview
          </h2>
          <p className="mb-3 text-center text-[13px] italic text-text-secondary leading-relaxed">
            The Cross-Department Relationship Score (CDRS) measures how well
            departments perceive the strength of your alignment and working
            relationship.
          </p>
          <p className="mb-2 text-[13px] text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Incoming CDRS</strong> shows
            how other departments rate the team listed. The{" "}
            <strong className="text-text-primary">Outgoing CDRS</strong> shows
            how the listed team rated other departments.
          </p>
          <p className="mb-4 text-center text-[13px] italic text-text-secondary leading-relaxed">
            Together, these scores provide a broad sentiment of the working
            relationship between two departments.
          </p>

          <hr className="my-4 border-border-default" />

          <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-blue-300 underline-offset-4">
            Utilization
          </h2>
          <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
            The Incoming CDRS can be used broadly to{" "}
            <strong className="text-text-primary">benchmark</strong> the
            expected relational strength within the organization and{" "}
            <strong className="text-text-primary">
              target improvements fairly
            </strong>
            .
          </p>
          <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
            Separately, identifying{" "}
            <strong className="text-text-primary">gaps</strong> in the two
            scores can also highlight unique opportunities:
          </p>
          <p className="mb-2 text-[12px] italic text-nsp-orange-500 leading-relaxed">
            Teams with higher Incoming than Outgoing scores may not be
            communicating needs clearly or fully processing through concerns in a
            healthy manner.
          </p>
          <p className="text-[12px] italic text-nsp-blue-500 leading-relaxed">
            Teams with lower Incoming than Outgoing scores may be ignorant to
            their approach or the impact it&apos;s having on the individuals in
            other departments.
          </p>
        </Card>
      </div>

      {/* Center: Incoming CDRS bar chart */}
      <div className="lg:col-span-5">
        <Card title="Incoming CDRS">
          <GradientBarChart
            data={incomingData}
            average={data.meta.dwsAverageIncoming}
          />
          <p className="mt-2 text-center text-xs text-text-muted">
            Average: {data.meta.dwsAverageIncoming.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Right: Outgoing CDRS table */}
      <div className="lg:col-span-4">
        <ScoreTable
          title="Outgoing CDRS"
          headers={["Dept", "Score"]}
          rows={outgoingData}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 3: Collaboration Index
// ════════════════════════════════════════════════════════════
function CiTab({ data }: { data: CollaborationData }) {
  const ciData = data.departmentMetrics
    .slice()
    .sort((a, b) => b.collaborationIndex - a.collaborationIndex)
    .map((d) => ({ name: d.department, value: d.collaborationIndex }));

  // Aggregate CI question scores across all departments
  const aggregatedQuestions = data.meta.ciQuestions.map((q, qi) => {
    const scores = data.departmentMetrics
      .map((d) => d.questionScores[qi]?.score ?? 0)
      .filter((s) => s > 0);
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    return { label: q, score: Math.round(avgScore * 10) / 10 };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: Overview text */}
      <div className="lg:col-span-3">
        <Card>
          <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-blue-300 underline-offset-4">
            Overview
          </h2>
          <p className="mb-3 text-center text-[13px] italic text-text-secondary leading-relaxed">
            The Collaboration Index (CI) is a deeper, department-specific measure
            of collaboration quality. It is based on optional,
            department-selected feedback containing quantitative ratings and
            qualitative comments.
          </p>
          <p className="mb-4 text-[13px] italic text-text-secondary leading-relaxed">
            It includes 9 quantitative questions and 5 qualitative prompts,
            giving a more nuanced view of strengths, challenges, and
            relationship dynamics.
          </p>

          <hr className="my-4 border-border-default" />

          <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-blue-300 underline-offset-4">
            Utilization
          </h2>
          <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
            Use the Collaboration Index scores to recognize both{" "}
            <strong className="text-text-primary">holistic</strong> and{" "}
            <strong className="text-text-primary">department-specific</strong>{" "}
            feedback. Leverage team strengths and{" "}
            <strong className="text-text-primary">
              facilitate an open conversation
            </strong>{" "}
            about lower scores.
          </p>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Utilize department scores along with qualitative feedback to{" "}
            <strong className="text-text-primary">
              develop strategic shifts
            </strong>{" "}
            in your approach with the{" "}
            <strong className="text-nsp-orange-500">
              2-3 lowest-scoring departments
            </strong>{" "}
            shown.
          </p>
        </Card>
      </div>

      {/* Center: CI bar chart */}
      <div className="lg:col-span-5">
        <Card title="Departmental Collaboration Index">
          <GradientBarChart
            data={ciData}
            average={data.meta.dwsAverageOverall}
          />
          <p className="mt-2 text-center text-xs text-text-muted">
            Average: {data.meta.dwsAverageOverall.toFixed(1)}
          </p>
        </Card>
      </div>

      {/* Right: CI Statements table */}
      <div className="lg:col-span-4">
        <ScoreTable
          title="CI Statements"
          headers={["Statement", "Collab Index"]}
          rows={aggregatedQuestions}
          showIndicator
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 4: Heatmap
// ════════════════════════════════════════════════════════════
function HeatmapTab({ data }: { data: CollaborationData }) {
  // Sort departments by incoming CDRS
  const sortedDepts = data.departmentMetrics
    .slice()
    .sort((a, b) => b.incomingCDRS - a.incomingCDRS)
    .map((d) => d.department);

  const columnTotals: Record<string, number> = {};
  const rowTotals: Record<string, number> = {};

  for (const dept of data.meta.departments) {
    const metric = data.departmentMetrics.find((m) => m.department === dept);
    columnTotals[dept] = metric?.outgoingCDRS ?? 0;
    rowTotals[dept] = metric?.incomingCDRS ?? 0;
  }

  return (
    <Card
      title="Cross-Department Relational Strength — Department Heatmap"
      subtitle="Each cell shows the average score that the row department received from the column department"
    >
      <HeatmapChart
        rows={sortedDepts}
        columns={sortedDepts}
        data={data.heatmapMatrix}
        columnTotals={columnTotals}
        rowTotals={rowTotals}
      />
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
//  Tab 5: Department Report
// ════════════════════════════════════════════════════════════
function DeptTab({ data }: { data: CollaborationData }) {
  const [selectedDept, setSelectedDept] = useState(
    data.departmentDetails[0]?.department ?? ""
  );

  const detail = useMemo(
    () => data.departmentDetails.find((d) => d.department === selectedDept),
    [data.departmentDetails, selectedDept]
  );

  if (!detail) return null;

  const incomingBars = detail.incomingByDept.map((d) => ({
    name: d.department,
    value: d.score,
  }));

  const outgoingRows = detail.outgoingByDept.map((d) => ({
    label: d.department,
    score: d.score,
  }));

  const questionRows = detail.questionScores.map((q) => ({
    label: q.question,
    score: q.score,
  }));

  return (
    <div className="space-y-6">
      {/* Header with selector and KPI cards */}
      <div className="flex flex-wrap items-start gap-4">
        <Card className="flex-1">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Select Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-lg border border-border-default bg-white px-4 py-2.5 text-lg font-bold text-text-primary shadow-sm focus:border-nsp-blue-400 focus:ring-2 focus:ring-nsp-blue-100 focus:outline-none"
              >
                {data.meta.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <h2 className="font-serif text-3xl font-bold text-text-primary">
              {selectedDept}
            </h2>
            <div className="ml-auto flex gap-3">
              <KpiCard
                label="Incoming CDRS"
                value={detail.incomingCDRS}
                color="var(--color-nsp-blue-500)"
              />
              <KpiCard
                label="Responses"
                value={detail.responseCount}
                isCount
                color="var(--color-text-secondary)"
              />
              <KpiCard
                label="Outgoing CDRS"
                value={detail.outgoingCDRS}
                color="var(--color-nsp-orange-400)"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Body: Overview + Charts */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: overview text */}
        <div className="lg:col-span-3">
          <Card>
            <h2 className="mb-3 text-center font-serif text-lg font-bold text-text-primary underline decoration-nsp-blue-300 underline-offset-4">
              Cross-Department Relational Strength
            </h2>
            <h3 className="mb-2 text-center text-sm font-semibold text-text-secondary">
              Overview
            </h3>
            <p className="mb-3 text-center text-[13px] italic text-text-secondary leading-relaxed">
              The Cross-Department Relationship Score (CDRS) measures how well
              departments perceive the strength of your alignment and working
              relationship.
            </p>
            <p className="mb-2 text-[13px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Incoming CDRS</strong> shows
              how other departments rate their experience working with your team.
            </p>
            <p className="mb-4 text-[13px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Outgoing CDRS</strong> shows
              how your team rates their experience working with others.
            </p>
            <p className="mb-4 text-center text-[13px] italic text-text-secondary leading-relaxed">
              Together, these scores provide a broad sentiment of the working
              relationship between two departments.
            </p>

            <hr className="my-4 border-border-default" />

            <h3 className="mb-2 text-center font-serif text-base font-bold text-text-primary underline decoration-nsp-orange-300 underline-offset-4">
              Action Recommendation
            </h3>
            <p className="mb-3 text-[13px] text-text-secondary leading-relaxed">
              Use the Incoming and Outgoing CDRS to identify where your
              team&apos;s relationships are strongest and where support may need
              improvement.
            </p>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Look for{" "}
              <strong className="text-text-primary">low incoming scores</strong>{" "}
              and{" "}
              <strong className="text-text-primary">significant gaps</strong>{" "}
              between incoming and outgoing. With appropriate context, work with
              department leadership to develop a{" "}
              <strong className="text-nsp-blue-500">90-180 day plan</strong> to
              improve the relationships that matter most to your team.
            </p>
          </Card>

          {/* CI Statement Scores */}
          {questionRows.length > 0 && (
            <div className="mt-6">
              <ScoreTable
                title="Collaboration Index — Statements"
                headers={["Statement", "Score"]}
                rows={questionRows}
                showIndicator
              />
            </div>
          )}
        </div>

        {/* Center: Incoming CDRS bar chart */}
        <div className="lg:col-span-5">
          <Card title="Incoming CDRS">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-md border border-border-default bg-white px-3 py-1.5 text-sm text-text-primary"
              >
                {data.meta.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <GradientBarChart data={incomingBars} />
            <ColorLegend className="mt-3 justify-center" />
          </Card>
        </div>

        {/* Right: Outgoing CDRS table */}
        <div className="lg:col-span-4">
          <div className="mb-4">
            <ScoreTable
              title={`Outgoing CDRS — ${selectedDept}`}
              headers={["Dept", "CDRS"]}
              rows={outgoingRows}
            />
          </div>
          {/* Total row */}
          <div className="rounded-xl border border-border-default bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary">Total</span>
              <span className="text-lg font-bold text-nsp-blue-500">
                {detail.outgoingCDRS.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Shared Components
// ════════════════════════════════════════════════════════════

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border-default bg-white p-5 shadow-sm ${className ?? ""}`}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  isCount,
}: {
  label: string;
  value: number;
  color: string;
  isCount?: boolean;
}) {
  return (
    <div className="min-w-[120px] rounded-xl border border-border-default bg-white px-5 py-3 text-center shadow-sm">
      <p className="text-3xl font-extrabold" style={{ color }}>
        {isCount ? value : value.toFixed(1)}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
    </div>
  );
}
