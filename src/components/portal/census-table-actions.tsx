"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CensusUploadSummary } from "@/types/census";

interface CensusTableActionsProps {
  upload: CensusUploadSummary;
}

export function CensusTableActions({ upload }: CensusTableActionsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!file) {
        throw new Error("Choose an updated census CSV before uploading.");
      }

      if (!upload.dashboardAssetId) {
        throw new Error("This census is not linked to a dashboard, so it cannot be updated here.");
      }

      const formData = new FormData();
      formData.append("clientId", upload.clientId);
      formData.append("surveyId", upload.surveyId);
      formData.append("surveyLabel", upload.surveyLabel);
      formData.append("dashboardAssetId", upload.dashboardAssetId);
      formData.append("file", file);

      const response = await fetch("/api/portal/census", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string; upload?: CensusUploadSummary };

      if (!response.ok || !payload.upload) {
        throw new Error(payload.error || "Unable to update census.");
      }

      setFile(null);
      setDialogOpen(false);
      router.push(`/portal/census/${payload.upload.id}`);
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update census.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
        <a href={`/api/portal/census/${upload.id}/download`}>
          <Download className="h-4 w-4" />
          Download CSV
        </a>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
            <Upload className="h-4 w-4" />
            Update
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl rounded-[28px] border-[#D6DEE3] p-0">
          <DialogHeader className="border-b border-[#E1E7EB] px-6 py-5">
            <DialogTitle className="text-xl text-[#2B2B2B]">Update Census</DialogTitle>
            <DialogDescription className="text-[#60727D]">
              Upload a revised CSV for this same survey. The existing file remains in upload history.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 px-6 py-6">
            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-3 text-sm text-[#60727D]">
              <p className="font-semibold text-[#2B2B2B]">{upload.surveyLabel}</p>
              <p className="mt-1">
                {upload.surveyId} · {upload.dashboardTitle ?? upload.dashboardAssetId ?? "Dashboard not linked"}
              </p>
            </div>
            <Input
              label="Updated Census CSV"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}

            <Button
              type="submit"
              disabled={saving || !upload.dashboardAssetId}
              className="w-full rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
            >
              {saving ? "Uploading..." : "Upload Updated Census"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
