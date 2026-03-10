"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Upload,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { Survey } from "@/types/database";

export default function DataPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/surveys");
        if (res.ok) {
          const data = await res.json();
          setSurveys(data.surveys || []);
        }
      } catch (err) {
        console.error("Failed to fetch surveys:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalResponses = surveys.reduce((sum, s) => sum + s.response_count, 0);
  const activeSurveys = surveys.filter((s) => s.status === "active").length;

  // Pipeline visualization steps
  const pipelineSteps = [
    {
      title: "Collect",
      description: "SurveyMonkey webhook receives responses",
      icon: Database,
      status: activeSurveys > 0 ? "active" : "waiting",
    },
    {
      title: "Transform",
      description: "Parse answers, extract dimensions & traits",
      icon: ArrowRight,
      status: totalResponses > 0 ? "active" : "waiting",
    },
    {
      title: "Aggregate",
      description: "Compute metrics, averages, benchmarks",
      icon: CheckCircle2,
      status: totalResponses > 0 ? "active" : "waiting",
    },
    {
      title: "Report",
      description: "Visualize in interactive reports for clients",
      icon: ArrowRight,
      status: "waiting",
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Data</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitor the data pipeline and manage imports.
          </p>
        </div>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-5 sm:grid-cols-4">
        {[
          { label: "Total Responses", value: totalResponses },
          { label: "Active Surveys", value: activeSurveys },
          { label: "Pending Processing", value: 0 },
          { label: "Failed Imports", value: 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-extrabold text-text-primary">
                  {stat.value}
                </p>
              )}
              <p className="text-xs text-text-muted">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline visualization */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Data Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {pipelineSteps.map((step, i) => (
              <div key={step.title} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      step.status === "active"
                        ? "bg-nsp-green-50 text-nsp-green-600"
                        : "bg-surface-secondary text-text-muted"
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-text-primary">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-center text-[10px] text-text-muted max-w-[120px]">
                    {step.description}
                  </p>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="h-px w-8 bg-border shrink-0 mb-8" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Survey data sources */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : surveys.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Database className="h-8 w-8 text-text-muted" />
              <p className="mt-3 text-sm text-text-muted">
                No data sources yet. Connect a survey to begin importing data.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-green-50 text-nsp-green-600">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{survey.title}</p>
                      <p className="text-xs text-text-muted">
                        {survey.surveymonkey_id
                          ? `SM: ${survey.surveymonkey_id}`
                          : "Manual import"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {survey.response_count} responses
                    </span>
                    <Badge
                      variant={
                        survey.status === "active"
                          ? "success"
                          : survey.status === "closed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {survey.status === "active" && (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {survey.status === "closed" && (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      )}
                      {survey.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
