import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, Database, MessageSquare, Users } from "lucide-react";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";
import { loadDwsEEDataMap, type EEDataMap } from "@/lib/employee-experience/dws-dashboard";

export const dynamic = "force-dynamic";

function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-border-default pb-3 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nsp-blue-50">
        <Icon className="h-4 w-4 text-nsp-blue-600" />
      </div>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <span className="ml-auto rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
        {count}
      </span>
    </div>
  );
}

function Pill({ label, variant = "default" }: { label: string; variant?: "default" | "success" | "warning" | "muted" }) {
  const styles = {
    default: "bg-nsp-blue-50 text-nsp-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    muted: "bg-surface-3 text-text-secondary",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}

function QuestionsTable({ questions }: { questions: EEDataMap["questions"] }) {
  const byDimension = questions.reduce<Record<string, typeof questions>>((acc, q) => {
    if (!acc[q.dimension]) acc[q.dimension] = [];
    acc[q.dimension].push(q);
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-2">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-16">ID</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-44">Index / Dimension</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Statement</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byDimension).map(([dimension, items]) =>
            items.map((q, i) => (
              <tr
                key={q.itemId}
                className="border-b border-border-default last:border-0 hover:bg-surface-2/60 transition-colors"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">{q.itemId}</td>
                <td className="px-4 py-2.5">
                  {i === 0 ? (
                    <Pill label={dimension} variant="default" />
                  ) : (
                    <span className="text-xs text-text-tertiary">↳</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text-primary">{q.statement}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function CommentFieldsTable({ fields }: { fields: EEDataMap["commentFields"] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-2">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-44">Field</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-28">Item IDs</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Matched Statement (from CSV)</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-32">Source</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr
              key={f.key}
              className="border-b border-border-default last:border-0 hover:bg-surface-2/60 transition-colors"
            >
              <td className="px-4 py-2.5">
                <div className="font-medium text-text-primary">{f.label}</div>
                <div className="text-xs text-text-tertiary font-mono">{f.key}</div>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">
                {f.resolvedItemIds.length > 0 ? f.resolvedItemIds.join(", ") : <span className="text-amber-600">none</span>}
              </td>
              <td className="px-4 py-2.5 text-text-primary">
                {f.statementText ? (
                  <span>{f.statementText}</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    No matching Comment row found in statements CSV
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {f.resolvedFromCSV ? (
                  <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    From CSV
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Fallback IDs
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemographicsTable({ demographics }: { demographics: EEDataMap["demographics"] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-2">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-40">Field</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-56">Column Aliases Searched</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">Sample Values</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary w-24">Distinct</th>
          </tr>
        </thead>
        <tbody>
          {demographics.map((d) => (
            <tr
              key={d.field}
              className="border-b border-border-default last:border-0 hover:bg-surface-2/60 transition-colors"
            >
              <td className="px-4 py-2.5">
                <div className="font-medium text-text-primary">{d.label}</div>
                <div className="text-xs text-text-tertiary font-mono">{d.field}</div>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {d.columnAliases.map((alias) => (
                    <code key={alias} className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text-secondary">
                      {alias}
                    </code>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2.5">
                {d.sampleValues.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {d.sampleValues.map((v) => (
                      <Pill key={v} label={v} variant="muted" />
                    ))}
                    {d.totalDistinct > d.sampleValues.length && (
                      <Pill label={`+${d.totalDistinct - d.sampleValues.length} more`} variant="muted" />
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    No values found — column may be missing
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 font-mono text-sm text-text-secondary">{d.totalDistinct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PortalDataMapPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const instance = await getFirebaseDashboardInstanceById(instanceId);
  if (!instance) notFound();
  if (instance.family !== "employee_experience") notFound();

  let map: EEDataMap | null = null;
  let loadError: string | null = null;

  try {
    map = await loadDwsEEDataMap(instance.dataSource.sourceClientId ?? undefined);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Unknown error loading data map.";
  }

  const allCommentsResolvedFromCSV = map?.commentFields.every((f) => f.resolvedFromCSV) ?? false;
  const anyCommentMissing = map?.commentFields.some((f) => f.resolvedItemIds.length === 0) ?? false;

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1">Data Map</div>
          <h1 className="text-2xl font-bold text-text-primary">{instance.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Verifies how the statements CSV and database CSV are parsed and mapped to dashboard fields.
          </p>
        </div>
        {map && (
          <div className="flex flex-col items-end gap-1 text-right">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${allCommentsResolvedFromCSV && !anyCommentMissing ? "text-green-700" : "text-amber-600"}`}>
              {allCommentsResolvedFromCSV && !anyCommentMissing ? (
                <><CheckCircle2 className="h-4 w-4" /> All comment fields resolved from CSV</>
              ) : (
                <><AlertTriangle className="h-4 w-4" /> Some comment fields using fallback IDs</>
              )}
            </div>
            <div className="text-xs text-text-tertiary">
              {map.meta.respondentCount.toLocaleString()} respondents · {map.meta.campaigns.length} survey wave{map.meta.campaigns.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">Failed to load data map</div>
            <div className="text-sm text-red-700 mt-0.5">{loadError}</div>
          </div>
        </div>
      )}

      {map && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Organization", value: map.meta.organizationName },
              { label: "Database File", value: map.meta.dataFile },
              { label: "Statements File", value: map.meta.statementsFile },
              { label: "Survey waves", value: map.meta.campaigns.join(", ") || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border-default bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{label}</div>
                <div className="mt-1 text-sm font-medium text-text-primary break-all">{value}</div>
              </div>
            ))}
          </div>

          <section>
            <SectionHeader icon={Database} title="Survey Questions" count={map.questions.length} />
            <QuestionsTable questions={map.questions} />
          </section>

          <section>
            <SectionHeader icon={MessageSquare} title="Open Text / Comment Fields" count={map.commentFields.length} />
            <p className="text-sm text-text-secondary mb-3">
              These fields are resolved from <code className="text-xs bg-surface-3 px-1 py-0.5 rounded">Comment</code>-typed rows in the statements CSV.
            </p>
            <CommentFieldsTable fields={map.commentFields} />
          </section>

          <section>
            <SectionHeader icon={Users} title="Demographic Fields" count={map.demographics.length} />
            <DemographicsTable demographics={map.demographics} />
          </section>
        </>
      )}
    </div>
  );
}
