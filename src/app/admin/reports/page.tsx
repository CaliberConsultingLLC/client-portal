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
import { BarChart3, Plus, Eye } from "lucide-react";
import type { Report, Campaign } from "@/types/database";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [campaignId, setCampaignId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, campaignsRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/campaigns"),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
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
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          campaign_id: campaignId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create report");
        return;
      }

      setTitle("");
      setCampaignId("");
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
      header: "Report",
      render: (report: Report) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-blue-50 text-nsp-blue-600">
            <BarChart3 className="h-4 w-4" />
          </div>
          <p className="font-medium">{report.title}</p>
        </div>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      render: (report: Report) =>
        report.campaign?.name || <span className="text-text-muted">—</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (report: Report) => (
        <Badge
          variant={
            report.status === "published"
              ? "success"
              : report.status === "archived"
              ? "default"
              : "secondary"
          }
        >
          {report.status}
        </Badge>
      ),
    },
    {
      key: "published_at",
      header: "Published",
      render: (report: Report) =>
        report.published_at
          ? new Date(report.published_at).toLocaleDateString()
          : <span className="text-text-muted">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      ),
      className: "w-12",
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Reports</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Build and manage client reports.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Report</DialogTitle>
              <DialogDescription>
                Create a new report from campaign data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Input
                label="Report Title *"
                placeholder="Q1 2026 Culture Assessment"
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
                {submitting ? "Creating..." : "Create Report"}
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
              data={reports}
              emptyMessage="No reports yet. Create one to start visualizing data."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
