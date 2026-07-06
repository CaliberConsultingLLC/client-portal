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

interface PerspectiveProductWorkbenchProps {
  mode: "create" | "edit";
  perspective?: {
    id: string;
    dashboardId: string;
    family: "collaboration" | "integration" | "employee_experience";
    title: string;
    versionLabel?: string | null;
    description: string;
    rendererKey: string;
    defaultCategoryLabels?: string[];
    notes?: string | null;
    status: "active" | "draft";
  };
  dashboards: Array<{
    id: string;
    title: string;
    versionLabel?: string | null;
    family: "collaboration" | "integration" | "employee_experience";
  }>;
  dashboardInstances: Array<{
    id: string;
    title: string;
    clientNames: string[];
    status: "active" | "inactive" | "draft";
  }>;
  instances: Array<{
    id: string;
    title: string;
    clientNames: string[];
    status: "active" | "inactive";
    dashboardInstanceId: string;
  }>;
}

export function PerspectiveProductWorkbench({
  mode,
  perspective,
  dashboards,
  dashboardInstances,
  instances,
}: PerspectiveProductWorkbenchProps) {
  const router = useRouter();
  const [dashboardId, setDashboardId] = useState(perspective?.dashboardId ?? dashboards[0]?.id ?? "");
  const [family, setFamily] = useState<
    "collaboration" | "integration" | "employee_experience"
  >(perspective?.family ?? dashboards[0]?.family ?? "integration");
  const [title, setTitle] = useState(perspective?.title ?? "");
  const [versionLabel, setVersionLabel] = useState(perspective?.versionLabel ?? "v.1.0");
  const [description, setDescription] = useState(perspective?.description ?? "");
  const [rendererKey, setRendererKey] = useState(perspective?.rendererKey ?? "");
  const [categoriesInput, setCategoriesInput] = useState(
    perspective?.defaultCategoryLabels?.join(", ") ?? ""
  );
  const [notes, setNotes] = useState(perspective?.notes ?? "");
  const [status, setStatus] = useState<"active" | "draft">(perspective?.status ?? "active");
  const [selectedDashboardInstanceId, setSelectedDashboardInstanceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adoptionError, setAdoptionError] = useState("");
  const [adoptionSuccess, setAdoptionSuccess] = useState("");

  const availableDashboardInstances = useMemo(
    () => dashboardInstances.filter((instance) => instance.status !== "inactive"),
    [dashboardInstances]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const defaultCategoryLabels = categoriesInput
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);
      const endpoint =
        mode === "create" ? "/api/portal/perspectives" : `/api/portal/perspectives/${perspective?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dashboardId,
          family,
          title,
          versionLabel,
          description,
          rendererKey,
          defaultCategoryLabels,
          notes: notes.trim() || null,
          status,
        }),
      });

      const payload = (await response.json()) as { error?: string; perspective?: { id: string } };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save perspective product.");
      }

      if (mode === "create" && payload.perspective?.id) {
        window.location.assign(`/portal/perspectives/library/${payload.perspective.id}`);
        return;
      }

      setSuccess("Perspective product updated successfully.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save perspective product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAdopt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!perspective?.id) {
      return;
    }

    setAdopting(true);
    setAdoptionError("");
    setAdoptionSuccess("");

    try {
      const response = await fetch(`/api/portal/perspectives/${perspective.id}/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dashboardInstanceId: selectedDashboardInstanceId,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to adopt perspective product.");
      }

      setAdoptionSuccess("Perspective adopted into dashboard instance successfully.");
      setSelectedDashboardInstanceId("");
      router.refresh();
    } catch (submitError) {
      setAdoptionError(
        submitError instanceof Error ? submitError.message : "Unable to adopt perspective product."
      );
    } finally {
      setAdopting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
            {mode === "create" ? "Add Perspective" : "Perspective Product"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
            {mode === "create"
              ? "Create a reusable perspective product that can later be adopted into dashboard instances."
              : "Manage the reusable perspective product and adopt it into compatible dashboard instances."}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
          <Link href="/portal/perspectives">
            <ArrowLeft className="h-4 w-4" />
            Back to perspectives
          </Link>
        </Button>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
            Perspective Product Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Dashboard Product"
                value={dashboardId}
                onChange={(event) => {
                  const nextDashboardId = event.target.value;
                  setDashboardId(nextDashboardId);
                  const nextDashboard = dashboards.find((dashboard) => dashboard.id === nextDashboardId);
                  if (nextDashboard) {
                    setFamily(nextDashboard.family);
                  }
                }}
              >
                {dashboards.map((dashboard) => (
                  <option key={dashboard.id} value={dashboard.id}>
                    {dashboard.title} {dashboard.versionLabel ?? ""}
                  </option>
                ))}
              </Select>
              <Select
                label="Perspective Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as "active" | "draft")}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </Select>
              <Input label="Perspective Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <Input label="Version" value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} required />
              <Input label="Renderer Key" value={rendererKey} onChange={(event) => setRendererKey(event.target.value)} required />
              <Input
                label="Default Categories"
                value={categoriesInput}
                onChange={(event) => setCategoriesInput(event.target.value)}
                placeholder="Canopy, Brand"
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
                {saving ? "Saving..." : mode === "create" ? "Create Perspective" : "Save Perspective"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {perspective ? (
        <>
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
                Adopt Perspective
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdopt} className="space-y-5">
                <Select
                  label="Dashboard Instance"
                  value={selectedDashboardInstanceId}
                  onChange={(event) => setSelectedDashboardInstanceId(event.target.value)}
                  required
                >
                  <option value="">Select a dashboard instance</option>
                  {availableDashboardInstances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.title} | {instance.clientNames.join(", ") || "Unassigned"}
                    </option>
                  ))}
                </Select>

                {adoptionError ? <p className="text-sm text-[#B04C4C]">{adoptionError}</p> : null}
                {adoptionSuccess ? <p className="text-sm text-[#355365]">{adoptionSuccess}</p> : null}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={adopting || !selectedDashboardInstanceId}
                    className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
                  >
                    {adopting ? "Adopting..." : "Adopt Into Dashboard Instance"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
                Existing Perspective Instances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {instances.length === 0 ? (
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-8 text-sm text-[#60727D]">
                  This perspective product has not been adopted into any dashboard instances yet.
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
                        {instance.clientNames.join(", ") || "Unassigned"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full bg-[#F4F7F9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                        {instance.status}
                      </span>
                      <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                        <Link href={`/portal/dashboards/instances/${instance.dashboardInstanceId}/perspectives`}>
                          Manage instance
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
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
