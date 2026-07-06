"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ReportProductWorkbenchProps {
  mode: "create" | "edit";
  report?: {
    id: string;
    dashboardId: string;
    perspectiveId?: string | null;
    title: string;
    versionLabel?: string | null;
    description: string;
    status: "active" | "draft" | "archived";
    notes?: string | null;
  };
  dashboards: Array<{
    id: string;
    title: string;
    versionLabel?: string | null;
  }>;
  perspectives: Array<{
    id: string;
    dashboardId: string;
    title: string;
    versionLabel?: string | null;
  }>;
  clients: Array<{
    id: string;
    name: string;
    status: "active" | "inactive" | "draft";
  }>;
  instances: Array<{
    id: string;
    title: string;
    clientName: string;
    status: "active" | "draft";
    publishedOn?: string | null;
    href?: string | null;
    downloadHref?: string | null;
  }>;
}

export function ReportProductWorkbench({
  mode,
  report,
  dashboards,
  perspectives,
  clients,
  instances,
}: ReportProductWorkbenchProps) {
  const router = useRouter();
  const [dashboardId, setDashboardId] = useState(report?.dashboardId ?? dashboards[0]?.id ?? "");
  const [perspectiveId, setPerspectiveId] = useState(report?.perspectiveId ?? "");
  const [title, setTitle] = useState(report?.title ?? "");
  const [versionLabel, setVersionLabel] = useState(report?.versionLabel ?? "v.1.0");
  const [description, setDescription] = useState(report?.description ?? "");
  const [status, setStatus] = useState<"active" | "draft" | "archived">(report?.status ?? "active");
  const [notes, setNotes] = useState(report?.notes ?? "");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [instanceTitle, setInstanceTitle] = useState("");
  const [instanceStatus, setInstanceStatus] = useState<"active" | "draft">("active");
  const [campaignLabel, setCampaignLabel] = useState("");
  const [publishedOn, setPublishedOn] = useState("");
  const [href, setHref] = useState("");
  const [downloadHref, setDownloadHref] = useState("");
  const [instanceNotes, setInstanceNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");

  const availablePerspectives = useMemo(
    () => perspectives.filter((perspective) => perspective.dashboardId === dashboardId),
    [perspectives, dashboardId]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const endpoint = mode === "create" ? "/api/portal/reports" : `/api/portal/reports/${report?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dashboardId,
          perspectiveId: perspectiveId || null,
          title,
          versionLabel,
          description,
          status,
          notes: notes.trim() || null,
        }),
      });

      const payload = (await response.json()) as { error?: string; report?: { id: string } };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save report product.");
      }

      if (mode === "create" && payload.report?.id) {
        window.location.assign(`/portal/reports/library/${payload.report.id}`);
        return;
      }

      setSuccess("Report product updated successfully.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save report product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!report?.id) {
      return;
    }

    setAssigning(true);
    setAssignmentError("");
    setAssignmentSuccess("");

    try {
      const response = await fetch(`/api/portal/reports/${report.id}/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: instanceTitle.trim() || null,
          status: instanceStatus,
          campaignLabel: campaignLabel.trim() || null,
          publishedOn: publishedOn.trim() || null,
          href: href.trim() || null,
          downloadHref: downloadHref.trim() || null,
          notes: instanceNotes.trim() || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create report instance.");
      }

      setAssignmentSuccess("Report instance created successfully.");
      setSelectedClientId("");
      setInstanceTitle("");
      setCampaignLabel("");
      setPublishedOn("");
      setHref("");
      setDownloadHref("");
      setInstanceNotes("");
      router.refresh();
    } catch (submitError) {
      setAssignmentError(
        submitError instanceof Error ? submitError.message : "Unable to create report instance."
      );
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
            {mode === "create" ? "Add Report" : "Report Product"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
            {mode === "create"
              ? "Create a reusable flat report product that can later be published as client-facing report instances."
              : "Manage the reusable report product and publish client-facing report instances from it."}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
          <Link href="/portal/reports">
            <ArrowLeft className="h-4 w-4" />
            Back to reports
          </Link>
        </Button>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
            Report Product Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Dashboard Product"
                value={dashboardId}
                onChange={(event) => {
                  setDashboardId(event.target.value);
                  setPerspectiveId("");
                }}
              >
                {dashboards.map((dashboard) => (
                  <option key={dashboard.id} value={dashboard.id}>
                    {dashboard.title} {dashboard.versionLabel ?? ""}
                  </option>
                ))}
              </Select>
              <Select
                label="Source Perspective"
                value={perspectiveId}
                onChange={(event) => setPerspectiveId(event.target.value)}
              >
                <option value="">No linked perspective</option>
                {availablePerspectives.map((perspective) => (
                  <option key={perspective.id} value={perspective.id}>
                    {perspective.title} {perspective.versionLabel ?? ""}
                  </option>
                ))}
              </Select>
              <Input label="Report Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <Input label="Version" value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} required />
              <Select
                label="Report Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as "active" | "draft" | "archived")}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>

            <Textarea
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[140px]"
              required
            />
            <Textarea
              label="Internal Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[120px]"
            />

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
            {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Saving..." : mode === "create" ? "Create Report" : "Save Report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {report ? (
        <>
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
                Publish Report Instance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssign} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Client Workspace"
                    value={selectedClientId}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                    required
                  >
                    <option value="">Select a client workspace</option>
                    {clients
                      .filter((client) => client.status !== "inactive")
                      .map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                  </Select>
                  <Select
                    label="Instance Status"
                    value={instanceStatus}
                    onChange={(event) => setInstanceStatus(event.target.value as "active" | "draft")}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </Select>
                  <Input
                    label="Report Title Override"
                    value={instanceTitle}
                    onChange={(event) => setInstanceTitle(event.target.value)}
                    placeholder={report.title}
                  />
                  <Input
                    label="Campaign Label"
                    value={campaignLabel}
                    onChange={(event) => setCampaignLabel(event.target.value)}
                    placeholder="Campaign 1"
                  />
                  <Input
                    label="Published On"
                    value={publishedOn}
                    onChange={(event) => setPublishedOn(event.target.value)}
                    placeholder="Mar 2026"
                  />
                  <Input
                    label="View Link"
                    value={href}
                    onChange={(event) => setHref(event.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Download Link"
                    value={downloadHref}
                    onChange={(event) => setDownloadHref(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <Textarea
                  label="Instance Notes"
                  value={instanceNotes}
                  onChange={(event) => setInstanceNotes(event.target.value)}
                  className="min-h-[120px]"
                />

                {assignmentError ? <p className="text-sm text-[#B04C4C]">{assignmentError}</p> : null}
                {assignmentSuccess ? <p className="text-sm text-[#355365]">{assignmentSuccess}</p> : null}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={assigning || !selectedClientId}
                    className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
                  >
                    {assigning ? "Publishing..." : "Create Report Instance"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
                Existing Report Instances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {instances.length === 0 ? (
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-8 text-sm text-[#60727D]">
                  This report product has not been published to any client workspaces yet.
                </div>
              ) : (
                instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[#D6DEE3] bg-[#F8FAFB] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#2B2B2B]">{instance.title}</p>
                      <p className="mt-1 text-sm text-[#60727D]">
                        {instance.clientName}
                        {instance.publishedOn ? ` | Published ${instance.publishedOn}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full bg-[#F4F7F9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                        {instance.status}
                      </span>
                      {(instance.href || instance.downloadHref) ? (
                        <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                          <Link href={instance.href || instance.downloadHref || "#"}>
                            Open link
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
