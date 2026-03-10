"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClipboardList, Plus, ExternalLink } from "lucide-react";
import type { Survey, Campaign } from "@/types/database";

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [surveymonkeyId, setSurveymonkeyId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [surveysRes, campaignsRes] = await Promise.all([
        fetch("/api/surveys"),
        fetch("/api/campaigns"),
      ]);

      if (surveysRes.ok) {
        const data = await surveysRes.json();
        setSurveys(data.surveys || []);
      }
      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!title.trim() || !campaignId) {
      setError("Title and campaign are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          campaign_id: campaignId,
          surveymonkey_id: surveymonkeyId.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create survey");
        return;
      }

      setTitle("");
      setCampaignId("");
      setSurveymonkeyId("");
      setDialogOpen(false);
      fetchData();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Survey",
      render: (survey: Survey) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-green-50 text-nsp-green-600">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{survey.title}</p>
            {survey.surveymonkey_id && (
              <p className="flex items-center gap-1 text-xs text-text-muted">
                <ExternalLink className="h-3 w-3" />
                SM: {survey.surveymonkey_id}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      render: (survey: Survey) =>
        survey.campaign?.name || <span className="text-text-muted">—</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (survey: Survey) => (
        <Badge
          variant={
            survey.status === "active"
              ? "success"
              : survey.status === "closed"
              ? "default"
              : "secondary"
          }
        >
          {survey.status}
        </Badge>
      ),
    },
    {
      key: "response_count",
      header: "Responses",
      render: (survey: Survey) => (
        <span className="font-medium">{survey.response_count}</span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (survey: Survey) =>
        new Date(survey.created_at).toLocaleDateString(),
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Surveys</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure and manage SurveyMonkey integrations.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect Survey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Survey</DialogTitle>
              <DialogDescription>
                Link a SurveyMonkey survey to a campaign to start importing
                responses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                label="Survey Title *"
                placeholder="Employee Engagement Survey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Select
                label="Campaign *"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Select campaign...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input
                label="SurveyMonkey Survey ID"
                placeholder="Optional — enter SM survey ID"
                value={surveymonkeyId}
                onChange={(e) => setSurveymonkeyId(e.target.value)}
              />

              {error && (
                <p className="text-sm text-nsp-red-500">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Connecting..." : "Connect Survey"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={surveys}
              emptyMessage="No surveys connected. Link a SurveyMonkey survey to get started."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
