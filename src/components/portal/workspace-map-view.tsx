"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { ClientWorkspaceMap } from "@/lib/firebase/workspace-map";
import type { IdAuditFinding } from "@/lib/firebase/id-registry-audit";
import { Button } from "@/components/ui/button";

interface WorkspaceMapViewProps {
  maps: ClientWorkspaceMap[];
  idAuditFindings: IdAuditFinding[];
  initialClientId: string;
}

function statusTone(status: string) {
  if (status === "active" || status === "configured" || status === "published") {
    return "bg-[#E4EDE5] text-[#2F7048]";
  }
  if (status === "sample" || status === "draft") {
    return "bg-[#FDF4E3] text-[#8A5E0A]";
  }
  if (status === "missing" || status === "inactive" || status === "hidden") {
    return "bg-[#FBEBE9] text-[#C96B60]";
  }
  return "bg-[#EDF2F5] text-[#60727D]";
}

export function WorkspaceMapView({ maps, idAuditFindings, initialClientId }: WorkspaceMapViewProps) {
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);

  const selectedMap = useMemo(
    () => maps.find((entry) => entry.clientId === selectedClientId) ?? maps[0] ?? null,
    [maps, selectedClientId]
  );

  if (!selectedMap) {
    return (
      <div className="rounded-2xl border border-dashed border-[#C9D2D8] bg-white px-8 py-12 text-center text-sm text-[#60727D]">
        No client workspaces are configured yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
      <div className="grid min-h-[720px] grid-cols-[220px_1fr]">
        <aside className="border-r border-[#D4DAD4] bg-[#F5F8F5] px-3 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9A8C]">
            Clients
          </p>
          <div className="mt-2 space-y-1">
            {maps.map((entry) => {
              const active = entry.clientId === selectedClientId;
              return (
                <button
                  key={entry.clientId}
                  type="button"
                  onClick={() => setSelectedClientId(entry.clientId)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
                    active ? "bg-[#E4EDE5]" : "hover:bg-[#ECF2ED]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-[#386B45]" : "bg-[#C7D0D8]"
                    }`}
                  />
                  <span
                    className={`text-sm ${active ? "font-semibold text-[#152238]" : "text-[#6E7E96]"}`}
                  >
                    {entry.clientName}
                  </span>
                  {entry.dashboards.length > 0 ? (
                    <span className="ml-auto rounded-full bg-[#C8E0CB] px-2 py-0.5 text-[10px] font-bold text-[#386B45]">
                      {entry.dashboards.length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6 px-8 py-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A9A8C]">
                Read-only workspace map
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#152238]">{selectedMap.clientName}</h1>
              <p className="mt-1 text-xs text-[#60727D]">
                Template → instance → access grant → assignment → perspective instances. Survey waves
                come from CSV analytics; live fieldings are Firestore automation records.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full border-[#D4DAD4]">
              <Link href={`/portal/clients/${selectedMap.clientId}`}>Open client workspace</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Dashboards", value: selectedMap.dashboards.length },
              { label: "Active users", value: selectedMap.activeUserCount },
              { label: "Survey waves", value: selectedMap.surveyWaveCount },
              { label: "Live fieldings", value: selectedMap.liveFieldingCount },
              { label: "Readouts", value: selectedMap.readoutCount },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-[#D4DAD4] bg-white px-4 py-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A9A8C]">
                  {metric.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#152238]">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#D4DAD4] bg-white">
            <div className="border-b border-[#EEF2EE] px-4 py-3">
              <h2 className="text-sm font-bold text-[#152238]">Dashboard assignments</h2>
              <p className="mt-1 text-xs text-[#60727D]">
                Grant → instance → asset URL → data source. These are the live routes clients use.
              </p>
            </div>
            {selectedMap.dashboards.length === 0 ? (
              <p className="px-4 py-8 text-sm text-[#60727D]">No dashboards assigned to this client.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead className="bg-[#F1F5F1] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                    <tr>
                      <th className="px-4 py-3">Dashboard</th>
                      <th className="px-4 py-3">Instance ID</th>
                      <th className="px-4 py-3">Asset ID</th>
                      <th className="px-4 py-3">Data source</th>
                      <th className="px-4 py-3">Access</th>
                      <th className="px-4 py-3 text-right">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMap.dashboards.map((row) => (
                      <tr key={row.grantId} className="border-t border-[#EEF2EE] align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#152238]">{row.title}</p>
                          <p className="mt-1 text-xs text-[#60727D]">Template: {row.templateId}</p>
                          <p className="mt-1 text-xs text-[#60727D]">
                            {row.perspectiveCount} perspective
                            {row.perspectiveCount === 1 ? "" : "s"}
                            {row.hiddenDimensions.length > 0
                              ? ` · hides ${row.hiddenDimensions.join(", ")}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#3B4B63]">{row.instanceId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#3B4B63]">{row.assetId}</td>
                        <td className="px-4 py-3">
                          <p className="text-[#3B4B63]">{row.dataSourceLabel}</p>
                          <p className="mt-1 font-mono text-xs text-[#60727D]">
                            {row.dataSourceKind}
                            {row.sourceClientId ? ` · clients/${row.sourceClientId}/data` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(
                                row.published ? "published" : "draft"
                              )}`}
                            >
                              {row.published ? "Published" : "Unpublished"}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(
                                row.grantStatus
                              )}`}
                            >
                              Grant {row.grantStatus}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(
                                row.instanceStatus
                              )}`}
                            >
                              Instance {row.instanceStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-end gap-1 text-xs font-semibold">
                            <Link href={row.href} className="inline-flex items-center gap-1 text-[#386B45]">
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <Link
                              href={`/portal/dashboards/instances/${row.instanceId}/settings`}
                              className="text-[#5E7898]"
                            >
                              Instance settings
                            </Link>
                            {row.assetId.includes("employee-experience") ? (
                              <Link
                                href={`/portal/dashboards/instances/${row.instanceId}/data-map`}
                                className="inline-flex items-center gap-1 text-[#60727D]"
                              >
                                <MapPin className="h-3 w-3" />
                                Data map
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#D4DAD4] bg-white px-4 py-4">
              <h2 className="text-sm font-bold text-[#152238]">Data workspace files</h2>
              <p className="mt-1 text-xs text-[#60727D]">
                {selectedMap.storageTarget ?? "Storage path not configured"}
              </p>
              <div className="mt-3 space-y-2">
                {selectedMap.files.length === 0 ? (
                  <p className="text-sm text-[#60727D]">No file slots defined.</p>
                ) : (
                  selectedMap.files.map((file) => (
                    <div
                      key={file.label}
                      className="flex items-start justify-between gap-3 rounded-lg bg-[#F5F8FA] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#152238]">{file.label}</p>
                        <p className="mt-0.5 text-xs text-[#60727D]">{file.description}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(
                          file.status
                        )}`}
                      >
                        {file.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-3 text-xs text-[#8A9A8C]">
                {selectedMap.configuredFileCount} configured · {selectedMap.missingFileCount} missing
              </p>
            </div>

            <div className="rounded-xl border border-[#D4DAD4] bg-white px-4 py-4">
              <h2 className="text-sm font-bold text-[#152238]">Survey waves & insights</h2>
              <p className="mt-1 text-xs text-[#60727D]">
                Survey waves are parsed from CSV analytics files. Live fieldings are Firestore records for
                active SurveyMonkey + census workflows.
              </p>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9A8C]">
                    Survey waves (CSV)
                  </dt>
                  <dd className="mt-1 text-[#152238]">
                    {selectedMap.surveyWaveCount > 0
                      ? selectedMap.surveyWaves.join(" · ")
                      : "None detected from dashboard data sources"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9A8C]">
                    Latest live fielding
                  </dt>
                  <dd className="mt-1 text-[#152238]">
                    {selectedMap.latestLiveFieldingLabel ?? "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9A8C]">
                    Published readout
                  </dt>
                  <dd className="mt-1 text-[#152238]">
                    {selectedMap.publishedReadoutName ?? "None published"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A9A8C]">
                    Client key
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-[#3B4B63]">{selectedMap.clientId}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full border-[#D4DAD4]">
                  <Link href={`/portal/campaigns?clientId=${encodeURIComponent(selectedMap.clientId)}`}>
                    Live fielding
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full border-[#D4DAD4]">
                  <Link
                    href={`/portal/insights?clientId=${encodeURIComponent(selectedMap.clientId)}`}
                  >
                    Insights
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full border-[#D4DAD4]">
                  <Link href="/portal/readouts">Readouts</Link>
                </Button>
              </div>
            </div>
          </div>

          {idAuditFindings.length > 0 ? (
            <div className="rounded-xl border border-[#D4DAD4] bg-white px-4 py-4">
              <h2 className="text-sm font-bold text-[#152238]">ID registry audit</h2>
              <p className="mt-1 text-xs text-[#60727D]">
                Read-only checks for protected client routes and known legacy aliases. No IDs are changed
                automatically.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {idAuditFindings.map((finding, index) => (
                  <li
                    key={`${finding.message}-${index}`}
                    className={`rounded-lg px-3 py-2 ${
                      finding.severity === "warn" ? "bg-[#FDF4E3] text-[#8A5E0A]" : "bg-[#F5F8FA] text-[#3B4B63]"
                    }`}
                  >
                    <p className="font-medium">{finding.message}</p>
                    {finding.detail ? <p className="mt-1 text-xs">{finding.detail}</p> : null}
                    {finding.assetId ? (
                      <p className="mt-1 font-mono text-xs">{finding.instanceId} · {finding.assetId}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
