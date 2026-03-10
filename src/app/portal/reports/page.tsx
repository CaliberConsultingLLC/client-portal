"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreCard, NspBarChart, NspLineChart, NspRadarChart } from "@/components/charts";
import { BarChart3, Download, Calendar } from "lucide-react";

// Demo data — in production, this comes from the API via aggregated_metrics
const demoOverallScores = [
  { label: "Overall Engagement", value: 4.1, maxValue: 5, previousValue: 3.8, color: "var(--color-nsp-blue-500)" },
  { label: "Leadership Trust", value: 3.7, maxValue: 5, previousValue: 3.5, color: "var(--color-nsp-green-500)" },
  { label: "Communication", value: 3.4, maxValue: 5, previousValue: 3.6, color: "var(--color-nsp-orange-500)" },
  { label: "Growth Opportunities", value: 3.9, maxValue: 5, previousValue: 3.7, color: "var(--color-nsp-yellow-500)" },
];

const demoDimensionScores = [
  { name: "Engagement", value: 4.1 },
  { name: "Leadership", value: 3.7 },
  { name: "Communication", value: 3.4 },
  { name: "Collaboration", value: 3.9 },
  { name: "Growth", value: 3.9 },
  { name: "Work-Life Balance", value: 4.2 },
  { name: "Recognition", value: 3.5 },
];

const demoTrendData = [
  { period: "Q1 2025", engagement: 3.5, leadership: 3.2, communication: 3.1 },
  { period: "Q2 2025", engagement: 3.6, leadership: 3.3, communication: 3.2 },
  { period: "Q3 2025", engagement: 3.8, leadership: 3.5, communication: 3.4 },
  { period: "Q4 2025", engagement: 3.9, leadership: 3.5, communication: 3.5 },
  { period: "Q1 2026", engagement: 4.1, leadership: 3.7, communication: 3.4 },
];

const demoRadarData = [
  { dimension: "Engagement", value: 4.1, benchmark: 3.8, fullMark: 5 },
  { dimension: "Leadership", value: 3.7, benchmark: 3.6, fullMark: 5 },
  { dimension: "Communication", value: 3.4, benchmark: 3.5, fullMark: 5 },
  { dimension: "Collaboration", value: 3.9, benchmark: 3.7, fullMark: 5 },
  { dimension: "Growth", value: 3.9, benchmark: 3.4, fullMark: 5 },
  { dimension: "Recognition", value: 3.5, benchmark: 3.3, fullMark: 5 },
  { dimension: "Work-Life", value: 4.2, benchmark: 3.9, fullMark: 5 },
];

export default function PortalReportsPage() {
  const [activeReport] = useState("demo");

  // In production, check for published reports from the API.
  // For now, show the demo report to demonstrate the chart system.
  const hasReport = activeReport === "demo";

  if (!hasReport) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-text-primary">Reports</h1>
          <p className="mt-1 text-sm text-text-secondary">
            View your organization&apos;s published reports.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nsp-blue-50 text-nsp-blue-500">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-text-primary">
              No reports available
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Reports will appear here once published by your consultant.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Report header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Badge variant="success" className="mb-2">Published</Badge>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Q1 2026 Culture Assessment
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
            <Calendar className="h-3.5 w-3.5" />
            Published March 1, 2026
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {demoOverallScores.map((score) => (
          <ScoreCard key={score.label} {...score} />
        ))}
      </div>

      {/* Charts grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Dimension scores bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Scores by Dimension</CardTitle>
          </CardHeader>
          <CardContent>
            <NspBarChart
              data={demoDimensionScores}
              height={280}
              colorByIndex
            />
          </CardContent>
        </Card>

        {/* Radar chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              Culture Profile
              <span className="ml-2 text-xs font-normal text-text-muted">
                vs. Industry Benchmark
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NspRadarChart
              data={demoRadarData}
              height={280}
              showBenchmark
            />
          </CardContent>
        </Card>

        {/* Trend line chart — full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Score Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <NspLineChart
              data={demoTrendData}
              xAxisKey="period"
              series={[
                { dataKey: "engagement", name: "Engagement" },
                { dataKey: "leadership", name: "Leadership" },
                { dataKey: "communication", name: "Communication" },
              ]}
              height={300}
              showDots
              showLegend
            />
          </CardContent>
        </Card>
      </div>

      {/* Key insights */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-nsp-green-500" />
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">Engagement is trending up</strong>{" "}
                — Overall engagement score improved from 3.5 to 4.1 over the past
                year, a significant positive shift.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-nsp-orange-500" />
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">Communication needs attention</strong>{" "}
                — Communication dropped from 3.5 to 3.4 this quarter while other
                dimensions improved. This may indicate an emerging gap.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-nsp-blue-500" />
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">Above industry benchmark</strong>{" "}
                — Your organization scores above the industry benchmark in 5 of 7
                dimensions, with Work-Life Balance as the top performer.
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
