"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  GitCompareArrows,
  Save,
  Upload,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Users,
  Layers,
  Loader2,
  Trash2,
  RefreshCw,
  X,
  Plus,
} from "lucide-react";
import type { CollabCampaign, CollabCampaignStatus } from "@/types/database";

export default function CollabDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CollabCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Edit fields
  const [name, setName] = useState("");

  // Upload state
  const [responsesFile, setResponsesFile] = useState<File | null>(null);
  const [statementsFile, setStatementsFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const responsesRef = useRef<HTMLInputElement>(null);
  const statementsRef = useRef<HTMLInputElement>(null);

  // Dept normalization config
  const [deptMappings, setDeptMappings] = useState<
    { key: string; value: string }[]
  >([]);

  // Link copy
  const [copied, setCopied] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/collab-campaigns/${campaignId}`);
      if (!res.ok) {
        router.push("/admin/collab");
        return;
      }
      const data = await res.json();
      const c = data.campaign;
      setCampaign(c);
      setName(c.name);

      // Load dept normalization config
      const config = (c.config as Record<string, unknown>) ?? {};
      const deptNormalize =
        (config.deptNormalize as Record<string, string>) ?? {};
      setDeptMappings(
        Object.entries(deptNormalize).map(([key, value]) => ({ key, value }))
      );
    } catch {
      router.push("/admin/collab");
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
      // Build dept normalization map from key-value pairs
      const deptNormalize: Record<string, string> = {};
      for (const mapping of deptMappings) {
        if (mapping.key.trim() && mapping.value.trim()) {
          deptNormalize[mapping.key.trim()] = mapping.value.trim();
        }
      }

      const res = await fetch(`/api/collab-campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          config: { deptNormalize },
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

  const handleUpload = async () => {
    if (!responsesFile || !statementsFile) {
      setUploadError("Both CSV files are required");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("responses", responsesFile);
      formData.append("statements", statementsFile);

      const res = await fetch(
        `/api/collab-campaigns/${campaignId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      setUploadSuccess(
        `Processed successfully: ${data.summary.respondents} respondents, ${data.summary.departments} departments`
      );
      setResponsesFile(null);
      setStatementsFile(null);
      if (responsesRef.current) responsesRef.current.value = "";
      if (statementsRef.current) statementsRef.current.value = "";

      // Refresh campaign data
      fetchCampaign();
    } catch {
      setUploadError("Network error — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this collaboration campaign? This cannot be undone."
      )
    )
      return;

    try {
      const res = await fetch(`/api/collab-campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/collab");
      }
    } catch {
      setMessage("Failed to delete");
    }
  };

  const copyLink = () => {
    if (!campaign) return;
    const url = `${window.location.origin}/collaboration/${campaign.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status: CollabCampaignStatus) => {
    switch (status) {
      case "ready":
        return "success" as const;
      case "draft":
        return "secondary" as const;
      case "processing":
        return "warning" as const;
      case "error":
        return "destructive" as const;
      default:
        return "secondary" as const;
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
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/collab")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">
              {campaign.name}
            </h1>
            <p className="text-sm text-text-muted">
              {campaign.organization?.name || "Unknown client"} &middot;{" "}
              {campaign.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "ready" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                window.open(`/collaboration/${campaign.slug}`, "_blank")
              }
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Dashboard
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-nsp-red-500 hover:bg-nsp-red-50 hover:text-nsp-red-600"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompareArrows className="h-5 w-5" />
                Campaign Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Campaign Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

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

          {/* CSV Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {campaign.status === "ready" ? "Re-upload Data" : "Upload Data"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.status === "ready" && (
                <div className="rounded-lg border border-nsp-green-200 bg-nsp-green-50 p-3">
                  <p className="text-sm text-nsp-green-700">
                    <Check className="mr-1.5 inline-block h-4 w-4" />
                    Data has been processed. Re-uploading will replace the existing
                    results.
                  </p>
                </div>
              )}

              {campaign.status === "error" && campaign.error_message && (
                <div className="rounded-lg border border-nsp-red-200 bg-nsp-red-50 p-3">
                  <p className="text-sm text-nsp-red-700">
                    <AlertCircle className="mr-1.5 inline-block h-4 w-4" />
                    Previous upload failed: {campaign.error_message}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Responses CSV */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    Responses CSV *
                  </label>
                  <div className="relative">
                    <input
                      ref={responsesRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) =>
                        setResponsesFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="responses-file"
                    />
                    <label
                      htmlFor="responses-file"
                      className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border-default p-4 transition-colors hover:border-nsp-blue-300 hover:bg-nsp-blue-50/50"
                    >
                      <FileSpreadsheet className="h-8 w-8 text-text-muted" />
                      <div className="flex-1">
                        {responsesFile ? (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              {responsesFile.name}
                            </p>
                            <p className="text-xs text-text-muted">
                              {(responsesFile.size / 1024).toFixed(1)} KB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-text-secondary">
                              Select respondent data CSV
                            </p>
                            <p className="text-xs text-text-muted">
                              Main survey responses file
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Statements CSV */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">
                    Statements CSV *
                  </label>
                  <div className="relative">
                    <input
                      ref={statementsRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) =>
                        setStatementsFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="statements-file"
                    />
                    <label
                      htmlFor="statements-file"
                      className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border-default p-4 transition-colors hover:border-nsp-blue-300 hover:bg-nsp-blue-50/50"
                    >
                      <FileSpreadsheet className="h-8 w-8 text-text-muted" />
                      <div className="flex-1">
                        {statementsFile ? (
                          <>
                            <p className="text-sm font-medium text-text-primary">
                              {statementsFile.name}
                            </p>
                            <p className="text-xs text-text-muted">
                              {(statementsFile.size / 1024).toFixed(1)} KB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-text-secondary">
                              Select question/dept mapping CSV
                            </p>
                            <p className="text-xs text-text-muted">
                              Statement-to-department mapping
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {uploadError && (
                <p className="text-sm text-nsp-red-500">
                  <AlertCircle className="mr-1 inline-block h-3.5 w-3.5" />
                  {uploadError}
                </p>
              )}

              {uploadSuccess && (
                <p className="text-sm text-nsp-green-600">
                  <Check className="mr-1 inline-block h-3.5 w-3.5" />
                  {uploadSuccess}
                </p>
              )}

              <Button
                onClick={handleUpload}
                disabled={uploading || !responsesFile || !statementsFile}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {campaign.status === "ready"
                      ? "Re-process Data"
                      : "Upload & Process"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Dept Normalization Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Department Name Normalization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-text-muted">
                Map survey department names to statement department names when
                they differ. For example, if the survey says &ldquo;Field
                Supervisors&rdquo; but the statements file says &ldquo;Onsite
                Field Supervisors&rdquo;.
              </p>

              {deptMappings.map((mapping, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Survey name"
                    value={mapping.key}
                    onChange={(e) => {
                      const updated = [...deptMappings];
                      updated[idx] = { ...mapping, key: e.target.value };
                      setDeptMappings(updated);
                    }}
                  />
                  <span className="text-text-muted">→</span>
                  <Input
                    placeholder="Statements name"
                    value={mapping.value}
                    onChange={(e) => {
                      const updated = [...deptMappings];
                      updated[idx] = { ...mapping, value: e.target.value };
                      setDeptMappings(updated);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDeptMappings(deptMappings.filter((_, i) => i !== idx))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDeptMappings([...deptMappings, { key: "", value: "" }])
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Mapping
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Status</span>
                <Badge variant={statusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Respondents</span>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-text-muted" />
                  <span className="font-semibold">
                    {campaign.respondent_count || "—"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Departments</span>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-text-muted" />
                  <span className="font-semibold">
                    {campaign.department_count || "—"}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Created</span>
                <span className="text-sm">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-text-muted">Updated</span>
                <span className="text-sm">
                  {new Date(campaign.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Dashboard Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.status === "ready" ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-surface-3 p-3">
                    <p className="break-all text-xs font-mono text-text-secondary">
                      /collaboration/{campaign.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={copyLink}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        window.open(
                          `/collaboration/${campaign.slug}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Open
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Upload and process data to generate the dashboard link.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
