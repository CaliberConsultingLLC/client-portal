"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { DashboardInstancePageFrame } from "@/components/portal/dashboard-instance-page-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DashboardInstanceInformationFormProps {
  instanceId: string;
  initialValues: {
    assetId: string;
    title: string;
    description: string;
    family: "collaboration" | "integration" | "employee_experience";
    previewHref?: string | null;
    internalNotes?: string | null;
  };
}

export function DashboardInstanceInformationForm({
  instanceId,
  initialValues,
}: DashboardInstanceInformationFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [family, setFamily] = useState(initialValues.family);
  const [previewHref, setPreviewHref] = useState(initialValues.previewHref ?? "");
  const [internalNotes, setInternalNotes] = useState(initialValues.internalNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/portal/dashboard-instances/${instanceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          family,
          previewHref: previewHref.trim() || null,
          internalNotes: internalNotes.trim() || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save dashboard information.");
      }

      setSuccess("Dashboard information updated successfully.");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save dashboard information."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardInstancePageFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Dashboard Instance
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              Dashboard Information
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              Manage the core identity details for this dashboard instance, including how it is labeled,
              categorized, and documented internally.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/perspectives`}>
                Manage perspectives
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/access`}>
                Manage access
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/settings`}>
                Manage settings
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href="/portal/dashboards">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboards
              </Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Instance Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Dashboard Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <Input label="Asset ID" value={initialValues.assetId} disabled />
              <Select
                label="Dashboard Family"
                value={family}
                onChange={(event) =>
                  setFamily(event.target.value as "collaboration" | "integration" | "employee_experience")
                }
              >
                <option value="collaboration">Collaboration</option>
                <option value="integration">Integration</option>
                <option value="employee_experience">Employee Experience</option>
              </Select>
              <Input
                label="Preview Route"
                value={previewHref}
                onChange={(event) => setPreviewHref(event.target.value)}
                placeholder="/integration-effectiveness/demo"
              />
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
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              className="min-h-[140px]"
            />

            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm leading-relaxed text-[#60727D]">
              Use this page for dashboard identity and internal reference notes. Operational behavior,
              thresholds, and data-source controls should continue to live in dashboard settings.
            </div>

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
            {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Saving..." : "Save Information"}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardInstancePageFrame>
  );
}
