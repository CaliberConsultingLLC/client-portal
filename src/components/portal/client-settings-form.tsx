"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface ClientSettingsFormProps {
  clientId: string;
  initialValues: {
    status: "active" | "inactive" | "draft";
    visibilityThreshold?: number | null;
  };
}

export function ClientSettingsForm({
  clientId,
  initialValues,
}: ClientSettingsFormProps) {
  const [status, setStatus] = useState(initialValues.status);
  const [visibilityThreshold, setVisibilityThreshold] = useState(
    initialValues.visibilityThreshold?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/portal/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          visibilityThreshold: visibilityThreshold.trim() === "" ? null : Number(visibilityThreshold),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save client settings.");
      }

      setSuccess("Client settings updated successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save client settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Client Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              Client Settings
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              Manage workspace availability and the minimum visibility threshold used for small data
              segments in reporting.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
            <Link href="/portal/clients">
              <ArrowLeft className="h-4 w-4" />
              Back to clients
            </Link>
          </Button>
        </div>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Workspace Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Workspace Status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "active" | "inactive" | "draft")
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </Select>

              <Input
                label="Visibility Threshold"
                type="number"
                min={0}
                value={visibilityThreshold}
                onChange={(event) => setVisibilityThreshold(event.target.value)}
                placeholder="Leave blank to enter a rule-of number later"
              />
            </div>

            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm leading-relaxed text-[#60727D]">
              This threshold represents the `Rule of #` used for reporting. If a segment contains
              fewer unique data points than this value, it should be hidden in the dashboard while
              still rolling into larger aggregate views.
            </div>

            {error ? <p className="text-sm text-[#B04C4C]">{error}</p> : null}
            {success ? <p className="text-sm text-[#355365]">{success}</p> : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalContentFrame>
  );
}
