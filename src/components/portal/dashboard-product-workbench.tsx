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

interface DashboardProductWorkbenchProps {
  mode: "create" | "edit";
  dashboard?: {
    id: string;
    assetId: string;
    family: "collaboration" | "integration" | "employee_experience";
    title: string;
    versionLabel?: string | null;
    description: string;
    status: "active" | "draft" | "archived";
    categoryLabels?: string[];
  };
  clients: Array<{
    id: string;
    name: string;
    status: "active" | "inactive" | "draft";
    isDemo?: boolean;
  }>;
  instances: Array<{
    id: string;
    title: string;
    assetId: string;
    status: "active" | "inactive" | "draft";
    clientNames: string[];
    lastUsedAt?: string | null;
  }>;
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Not tracked yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function DashboardProductWorkbench({
  mode,
  dashboard,
  clients,
  instances,
}: DashboardProductWorkbenchProps) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(dashboard?.assetId ?? "");
  const [family, setFamily] = useState<
    "collaboration" | "integration" | "employee_experience"
  >(dashboard?.family ?? "integration");
  const [title, setTitle] = useState(dashboard?.title ?? "");
  const [versionLabel, setVersionLabel] = useState(dashboard?.versionLabel ?? "v.1.0");
  const [description, setDescription] = useState(dashboard?.description ?? "");
  const [status, setStatus] = useState<"active" | "draft" | "archived">(
    dashboard?.status ?? "active"
  );
  const [categoriesInput, setCategoriesInput] = useState(
    dashboard?.categoryLabels?.join(", ") ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [publishOnCreate, setPublishOnCreate] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");

  const availableClients = useMemo(
    () => clients.filter((client) => client.status !== "inactive"),
    [clients]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const categoryLabels = categoriesInput
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);
      const endpoint = mode === "create" ? "/api/portal/dashboards" : `/api/portal/dashboards/${dashboard?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId,
          family,
          title,
          versionLabel,
          description,
          status,
          categoryLabels,
        }),
      });

      const payload = (await response.json()) as { error?: string; dashboard?: { id: string } };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save dashboard product.");
      }

      if (mode === "create" && payload.dashboard?.id) {
        window.location.assign(`/portal/dashboards/library/${payload.dashboard.id}`);
        return;
      }

      setSuccess("Dashboard product updated successfully.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save dashboard product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dashboard?.id) {
      return;
    }

    setAssigning(true);
    setAssignmentError("");
    setAssignmentSuccess("");

    try {
      const response = await fetch(`/api/portal/dashboards/${dashboard.id}/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          published: publishOnCreate,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to assign dashboard product.");
      }

      setAssignmentSuccess("Dashboard instance created successfully.");
      setSelectedClientId("");
      router.refresh();
    } catch (submitError) {
      setAssignmentError(
        submitError instanceof Error ? submitError.message : "Unable to assign dashboard product."
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
            {mode === "create" ? "Add Dashboard" : "Dashboard Product"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
            {mode === "create"
              ? "Create a reusable dashboard product that can later be assigned into client dashboard instances."
              : "Manage the reusable dashboard product and create client-facing dashboard instances from it."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {dashboard ? (
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/library/${dashboard.id}?mode=assign`}>Assign dashboard</Link>
            </Button>
          ) : null}
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
          <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
            Dashboard Product Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Dashboard Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              <Input label="Version" value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} required />
              <Input label="Renderer Asset ID" value={assetId} onChange={(event) => setAssetId(event.target.value)} required />
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
              <Select
                label="Product Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as "active" | "draft" | "archived")}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
              <Input
                label="Categories"
                value={categoriesInput}
                onChange={(event) => setCategoriesInput(event.target.value)}
                placeholder="Integration, Executive, Demo"
              />
            </div>

            <Textarea
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[140px]"
              required
            />

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
            {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Saving..." : mode === "create" ? "Create Dashboard" : "Save Dashboard"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {dashboard ? (
        <>
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
                Assign Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssign} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Select
                    label="Client Workspace"
                    value={selectedClientId}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                    required
                  >
                    <option value="">Select a client workspace</option>
                    {availableClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                        {client.isDemo ? " (Demo)" : ""}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 rounded-2xl border border-[#D6DEE3] px-4 py-3 text-sm text-[#2B2B2B]">
                      <input
                        type="checkbox"
                        checked={publishOnCreate}
                        onChange={(event) => setPublishOnCreate(event.target.checked)}
                      />
                      Publish immediately
                    </label>
                  </div>
                </div>

                {assignmentError ? <p className="text-sm text-[#B04C4C]">{assignmentError}</p> : null}
                {assignmentSuccess ? <p className="text-sm text-[#355365]">{assignmentSuccess}</p> : null}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={assigning || !selectedClientId}
                    className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
                  >
                    {assigning ? "Creating..." : "Create Dashboard Instance"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
                Existing Instances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {instances.length === 0 ? (
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-8 text-sm text-[#60727D]">
                  No dashboard instances have been created from this product yet.
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
                        {instance.clientNames.join(", ") || "Unassigned"} | Last used {formatDateLabel(instance.lastUsedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full bg-[#F4F7F9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                        {instance.status}
                      </span>
                      <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                        <Link href={`/portal/dashboards/instances/${instance.id}/information`}>
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
