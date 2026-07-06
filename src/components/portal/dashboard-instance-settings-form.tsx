"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardInstancePageFrame } from "@/components/portal/dashboard-instance-page-frame";
import { Input } from "@/components/ui/input";
import { getDashboardDataMappingPreset } from "@/lib/portal/data-mapping";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PortalDashboardDataMapping, PortalDashboardFamily } from "@/types/portal";

interface DashboardInstanceSettingsFormProps {
  instanceId: string;
  title: string;
  initialValues: {
    family: PortalDashboardFamily;
    status: "active" | "inactive" | "draft";
    visibilityThreshold?: number | null;
    hiddenDimensionIds?: string[];
    dataSourceLabel: string;
    dataSourceKind: "synthetic_demo" | "firebase_csv_workspace" | "manual";
    dataSourceSourceClientId?: string | null;
    dataSourceNotes?: string | null;
    dataMapping?: PortalDashboardDataMapping | null;
  };
}

export function DashboardInstanceSettingsForm({
  instanceId,
  title,
  initialValues,
}: DashboardInstanceSettingsFormProps) {
  const router = useRouter();
  const mappingPreset = getDashboardDataMappingPreset(initialValues.family);
  const [status, setStatus] = useState(initialValues.status);
  const [visibilityThreshold, setVisibilityThreshold] = useState(
    initialValues.visibilityThreshold?.toString() ?? ""
  );
  const [hiddenDimensionIds, setHiddenDimensionIds] = useState(
    (initialValues.hiddenDimensionIds ?? []).join(", ")
  );
  const [dataSourceLabel, setDataSourceLabel] = useState(initialValues.dataSourceLabel);
  const [dataSourceKind, setDataSourceKind] = useState(initialValues.dataSourceKind);
  const [dataSourceSourceClientId, setDataSourceSourceClientId] = useState(
    initialValues.dataSourceSourceClientId ?? ""
  );
  const [dataSourceNotes, setDataSourceNotes] = useState(initialValues.dataSourceNotes ?? "");
  const [dataMappingStatus, setDataMappingStatus] = useState(
    initialValues.dataMapping?.status ?? "draft"
  );
  const [dataMappingNotes, setDataMappingNotes] = useState(initialValues.dataMapping?.notes ?? "");
  const [dataMappingFields, setDataMappingFields] = useState<Record<string, string>>(
    Object.fromEntries(
      mappingPreset.fields.map((field) => [
        field.key,
        initialValues.dataMapping?.fieldMappings?.[field.key] ?? "",
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const missingRequiredFieldCount = mappingPreset.fields.filter(
    (field) => field.required && !(dataMappingFields[field.key] ?? "").trim()
  ).length;

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
          status,
          visibilityThreshold: visibilityThreshold.trim() === "" ? null : Number(visibilityThreshold),
          hiddenDimensionIds: hiddenDimensionIds
            .split(/[\n,]/)
            .map((value) => value.trim())
            .filter(Boolean),
          dataSourceLabel,
          dataSourceKind,
          dataSourceSourceClientId: dataSourceSourceClientId.trim() || null,
          dataSourceNotes: dataSourceNotes.trim() || null,
          dataMappingStatus,
          dataMappingFieldMappings: dataMappingFields,
          dataMappingNotes: dataMappingNotes.trim() || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save dashboard settings.");
      }

      setSuccess("Dashboard settings updated successfully.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save dashboard settings."
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
              Dashboard Settings
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              Configure dashboard availability, reporting thresholds, and the data source details that
              belong to this dashboard instance.
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
              <Link href={`/portal/dashboards/instances/${instanceId}/access`}>
                Manage access
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
            <CardTitle className="text-xl text-[#2B2B2B]">Instance Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Dashboard Status"
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
                placeholder="Leave blank to inherit later"
              />

              <Input
                label="Hidden Indexes"
                value={hiddenDimensionIds}
                onChange={(event) => setHiddenDimensionIds(event.target.value)}
                placeholder="Example: acquisition"
              />

              <Input
                label="Data Source Label"
                value={dataSourceLabel}
                onChange={(event) => setDataSourceLabel(event.target.value)}
                required
              />

              <Select
                label="Data Source Kind"
                value={dataSourceKind}
                onChange={(event) =>
                  setDataSourceKind(
                    event.target.value as "synthetic_demo" | "firebase_csv_workspace" | "manual"
                  )
                }
              >
                <option value="synthetic_demo">Synthetic Demo</option>
                <option value="firebase_csv_workspace">Firebase CSV Workspace</option>
                <option value="manual">Manual</option>
              </Select>

              <Input
                label="Source Client ID"
                value={dataSourceSourceClientId}
                onChange={(event) => setDataSourceSourceClientId(event.target.value)}
                placeholder="Optional"
              />
            </div>

            <Textarea
              label="Data Source Notes"
              value={dataSourceNotes}
              onChange={(event) => setDataSourceNotes(event.target.value)}
              className="min-h-[140px]"
            />

            <div className="rounded-[24px] border border-[#D6DEE3] bg-[#FBFCFD] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                    Data Mapping
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                    Keep mapping attached to this dashboard instance so source-file differences stay
                    local and do not spill into the reusable dashboard product.
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                  {mappingPreset.label}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Select
                  label="Mapping Status"
                  value={dataMappingStatus}
                  onChange={(event) =>
                    setDataMappingStatus(event.target.value as "draft" | "validated" | "error")
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="validated">Validated</option>
                  <option value="error">Error</option>
                </Select>

                <div className="rounded-2xl border border-[#D6DEE3] bg-white px-4 py-3 text-sm text-[#60727D]">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    Current validation
                  </p>
                  <p className="mt-2">
                    {missingRequiredFieldCount
                      ? `${missingRequiredFieldCount} required field(s) still missing.`
                      : "Required fields currently mapped."}
                  </p>
                </div>
              </div>

              <Textarea
                label="Mapping Notes"
                value={dataMappingNotes}
                onChange={(event) => setDataMappingNotes(event.target.value)}
                className="mt-4 min-h-[110px]"
              />

              <details className="mt-4 rounded-2xl border border-[#D6DEE3] bg-white">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#2B2B2B]">
                  Edit field mappings
                </summary>
                <div className="border-t border-[#E5EBEF] px-4 py-4">
                  <p className="mb-4 text-sm leading-relaxed text-[#60727D]">
                    {mappingPreset.description}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {mappingPreset.fields.map((field) => (
                      <Input
                        key={field.key}
                        label={field.required ? `${field.label} *` : field.label}
                        value={dataMappingFields[field.key] ?? ""}
                        onChange={(event) =>
                          setDataMappingFields((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                      />
                    ))}
                  </div>
                </div>
              </details>

              {initialValues.dataMapping?.validation.warnings.length ? (
                <div className="mt-4 rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm leading-relaxed text-[#60727D]">
                  {initialValues.dataMapping.validation.warnings.join(" ")}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm leading-relaxed text-[#60727D]">
              These settings belong to the dashboard instance itself, not the client workspace. That
              keeps the dashboard as the primary object while still allowing access grants to be managed
              separately.
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
    </DashboardInstancePageFrame>
  );
}
