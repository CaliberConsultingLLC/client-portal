"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardInstancePageFrame } from "@/components/portal/dashboard-instance-page-frame";
import { Select } from "@/components/ui/select";

export type AccessMode = "none" | "active_published" | "active_unpublished" | "draft";

interface AccessRow {
  clientId: string;
  clientName: string;
  clientStatus: "active" | "inactive" | "draft";
  grantId?: string;
  initialMode: AccessMode;
}

interface DashboardInstanceAccessFormProps {
  instanceId: string;
  title: string;
  rows: AccessRow[];
}

function getModeLabel(mode: AccessMode) {
  if (mode === "active_published") return "Active + Published";
  if (mode === "active_unpublished") return "Active + Unpublished";
  if (mode === "draft") return "Draft";
  return "No Access";
}

export function DashboardInstanceAccessForm({
  instanceId,
  title,
  rows,
}: DashboardInstanceAccessFormProps) {
  const [accessModes, setAccessModes] = useState<Record<string, AccessMode>>(
    Object.fromEntries(rows.map((row) => [row.clientId, row.initialMode]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const enabledCount = useMemo(
    () => Object.values(accessModes).filter((mode) => mode !== "none").length,
    [accessModes]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/portal/dashboard-instances/${instanceId}/access`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grants: rows.map((row) => {
            const mode = accessModes[row.clientId] ?? "none";
            return {
              id: row.grantId,
              clientId: row.clientId,
              status:
                mode === "active_published" || mode === "active_unpublished"
                  ? "active"
                  : mode === "draft"
                    ? "draft"
                    : "hidden",
              published: mode === "active_published",
            };
          }),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save dashboard access.");
      }

      setSuccess("Dashboard access updated successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save dashboard access.");
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
              Dashboard Access
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              Control which client workspaces can open this dashboard instance and whether that access is
              published or still held in draft.
            </p>
            <p className="mt-3 text-base font-semibold text-[#2B2B2B]">{title}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/information`}>
                Manage information
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href={`/portal/dashboards/instances/${instanceId}/perspectives`}>
                Manage perspectives
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

        <div className="grid gap-5 md:grid-cols-3">
          <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{rows.length}</p>
              <p className="text-xs text-[#60727D]">Client Workspaces</p>
            </CardContent>
          </Card>
          <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{enabledCount}</p>
              <p className="text-xs text-[#60727D]">Enabled Access Grants</p>
            </CardContent>
          </Card>
          <Card className="rounded-[26px] border-[#D6DEE3] bg-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-extrabold text-[#2B2B2B]">
                {Object.values(accessModes).filter((mode) => mode === "active_published").length}
              </p>
              <p className="text-xs text-[#60727D]">Published Clients</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Client Access Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.clientId}
                  className="flex flex-col gap-4 rounded-2xl border border-[#D6DEE3] bg-[#F5F8FA] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[#2B2B2B]">{row.clientName}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#60727D]">
                      {row.clientId} | Workspace {row.clientStatus}
                    </p>
                  </div>
                  <div className="w-full max-w-[280px]">
                    <Select
                      label="Access Mode"
                      value={accessModes[row.clientId] ?? "none"}
                      onChange={(event) =>
                        setAccessModes((current) => ({
                          ...current,
                          [row.clientId]: event.target.value as AccessMode,
                        }))
                      }
                    >
                      <option value="none">{getModeLabel("none")}</option>
                      <option value="active_published">{getModeLabel("active_published")}</option>
                      <option value="active_unpublished">{getModeLabel("active_unpublished")}</option>
                      <option value="draft">{getModeLabel("draft")}</option>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm leading-relaxed text-[#60727D]">
              "No Access" stores the client as hidden, "Active + Published" makes the dashboard visible
              in the client portal, and the other modes keep the grant available internally without
              exposing it to the client.
            </div>

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
            {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Saving..." : "Save Access"}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardInstancePageFrame>
  );
}
