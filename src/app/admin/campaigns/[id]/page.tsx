"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Megaphone,
  Save,
  ClipboardList,
  Play,
  Pause,
  CheckCircle,
} from "lucide-react";
import type { Campaign, Survey, CampaignStatus } from "@/types/database";

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("draft");

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) {
        router.push("/admin/campaigns");
        return;
      }
      const data = await res.json();
      const c = data.campaign;
      setCampaign(c);
      setName(c.name);
      setDescription(c.description || "");
      setStatus(c.status);
      setSurveys(c.surveys || []);
    } catch {
      router.push("/admin/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          status,
        }),
      });
      if (res.ok) {
        setMessage("Saved");
        const data = await res.json();
        setCampaign(data.campaign);
      } else {
        const err = await res.json();
        setMessage(err.error || "Failed to save");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const setStatusQuick = async (newStatus: CampaignStatus) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
        setStatus(newStatus);
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/campaigns")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">
              {campaign.name}
            </h1>
            <p className="text-sm text-text-muted">
              {campaign.organization?.name || "Unknown client"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {status === "draft" && (
            <Button size="sm" onClick={() => setStatusQuick("active")}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Launch
            </Button>
          )}
          {status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusQuick("paused")}
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Pause
            </Button>
          )}
          {status === "paused" && (
            <Button size="sm" onClick={() => setStatusQuick("active")}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Resume
            </Button>
          )}
          {(status === "active" || status === "paused") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusQuick("completed")}
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              Complete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Campaign Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Select
                label="Status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as CampaignStatus)
                }
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                {message && (
                  <span className="text-sm text-text-secondary">{message}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Status</span>
                <Badge
                  variant={
                    status === "active"
                      ? "success"
                      : status === "paused"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Surveys</span>
                <span className="font-semibold">{surveys.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Created</span>
                <span className="text-sm">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Linked Surveys
              </CardTitle>
            </CardHeader>
            <CardContent>
              {surveys.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No surveys linked. Connect a SurveyMonkey survey from the
                  Surveys tab.
                </p>
              ) : (
                <div className="space-y-2">
                  {surveys.map((survey) => (
                    <div
                      key={survey.id}
                      className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-surface-secondary"
                    >
                      <span className="font-medium">{survey.title}</span>
                      <Badge variant="secondary">{survey.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
