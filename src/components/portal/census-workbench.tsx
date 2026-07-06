"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CensusUploadSummary } from "@/types/census";

interface CensusClientOption {
  id: string;
  name: string;
  shortName: string;
}

interface CensusDashboardOption {
  assetId: string;
  clientId: string;
  title: string;
}

interface CensusWorkbenchProps {
  clients: CensusClientOption[];
  dashboards: CensusDashboardOption[];
  uploads: CensusUploadSummary[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CensusWorkbench({ clients, dashboards, uploads }: CensusWorkbenchProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const availableDashboards = useMemo(
    () => dashboards.filter((dashboard) => dashboard.clientId === clientId),
    [dashboards, clientId]
  );
  const [dashboardAssetId, setDashboardAssetId] = useState(
    availableDashboards[0]?.assetId ?? ""
  );
  const [surveyId, setSurveyId] = useState("");
  const [surveyLabel, setSurveyLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const clientNameById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients]
  );
  const totalRows = uploads.reduce((sum, upload) => sum + upload.rowCount, 0);

  function handleClientChange(nextClientId: string) {
    const nextDashboard = dashboards.find((dashboard) => dashboard.clientId === nextClientId);
    setClientId(nextClientId);
    setDashboardAssetId(nextDashboard?.assetId ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!file) {
        throw new Error("Choose a census CSV file before uploading.");
      }

      const formData = new FormData();
      formData.append("clientId", clientId);
      formData.append("surveyId", surveyId);
      formData.append("surveyLabel", surveyLabel);
      formData.append("dashboardAssetId", dashboardAssetId);
      formData.append("file", file);

      const response = await fetch("/api/portal/census", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string; upload?: CensusUploadSummary };

      if (!response.ok || !payload.upload) {
        throw new Error(payload.error || "Unable to upload census.");
      }

      setSuccess(`${payload.upload.surveyLabel} census uploaded with ${payload.upload.rowCount} employees.`);
      setSurveyId("");
      setSurveyLabel("");
      setFile(null);
      setDialogOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to upload census.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
            Census
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
            Survey-specific census files
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
            Every census is tied to one survey and one dashboard. Employee IDs are only used for the
            current survey workflow and are not treated as longitudinal score history.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
              <Upload className="h-4 w-4" />
              Upload Census
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl rounded-[28px] border-[#D6DEE3] p-0">
            <DialogHeader className="border-b border-[#E1E7EB] px-6 py-5">
              <DialogTitle className="text-xl text-[#2B2B2B]">Upload Census</DialogTitle>
              <DialogDescription className="text-[#60727D]">
                Each file is tied to one survey. Required employee ID aliases: ID, EID, or Employee ID.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
              <Select
                label="Client"
                value={clientId}
                onChange={(event) => handleClientChange(event.target.value)}
                required
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Dashboard"
                value={dashboardAssetId}
                onChange={(event) => setDashboardAssetId(event.target.value)}
                required
              >
                {availableDashboards.length === 0 ? (
                  <option value="">No dashboards assigned</option>
                ) : (
                  availableDashboards.map((dashboard) => (
                    <option key={dashboard.assetId} value={dashboard.assetId}>
                      {dashboard.title}
                    </option>
                  ))
                )}
              </Select>
              <Input
                label="Survey ID"
                value={surveyId}
                onChange={(event) => setSurveyId(event.target.value)}
                placeholder="Example: sm-2026-q2"
                required
              />
              <Input
                label="Survey Label"
                value={surveyLabel}
                onChange={(event) => setSurveyLabel(event.target.value)}
                placeholder="Example: May 2026 Employee Experience"
                required
              />
              <Input
                label="Census CSV"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />

              {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
              {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

              <Button
                type="submit"
                disabled={saving || clients.length === 0 || !dashboardAssetId}
                className="w-full rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Uploading..." : "Upload Census"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{uploads.length}</p>
              <p className="text-xs text-[#60727D]">Uploaded census files</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{totalRows.toLocaleString()}</p>
              <p className="text-xs text-[#60727D]">Total census rows</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#386B45]">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{dashboards.length}</p>
              <p className="text-xs text-[#60727D]">Dashboard assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-[#2B2B2B]">All Census Uploads</CardTitle>
          <CardDescription className="text-[#60727D]">
            Admin directory for survey census files, their client, linked dashboard, and table view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D6DEE3] bg-[#F8FAFB] px-4 py-10 text-sm text-[#60727D]">
              No census files have been uploaded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#D6DEE3]">
              <div className="overflow-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-[#F5F8FA] text-xs uppercase tracking-[0.14em] text-[#60727D]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Survey ID</th>
                      <th className="px-4 py-3 font-semibold">Survey Label</th>
                      <th className="px-4 py-3 font-semibold">Date Updated</th>
                      <th className="px-4 py-3 font-semibold">Dashboard</th>
                      <th className="px-4 py-3 font-semibold">Rows</th>
                      <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EBEF]">
                    {uploads.map((upload) => (
                      <tr key={upload.id}>
                        <td className="px-4 py-3 font-medium text-[#2B2B2B]">
                          {clientNameById.get(upload.clientId) ?? upload.clientId}
                        </td>
                        <td className="px-4 py-3 text-[#2B2B2B]">{upload.surveyId}</td>
                        <td className="px-4 py-3 text-[#2B2B2B]">{upload.surveyLabel}</td>
                        <td className="px-4 py-3 text-[#60727D]">{formatDate(upload.updatedAt)}</td>
                        <td className="px-4 py-3 text-[#2B2B2B]">
                          {upload.dashboardTitle ?? upload.dashboardAssetId ?? "Not linked"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{upload.rowCount.toLocaleString()}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                              <Link href={`/portal/census/${upload.id}/manage`}>Manage</Link>
                            </Button>
                            <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                              <Link href={`/portal/census/${upload.id}`}>Census Table</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
