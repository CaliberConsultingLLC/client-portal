import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FolderKanban,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { getFirebaseDataWorkspaces } from "@/lib/firebase/portal-store";
import type { ClientDataWorkspace, DataFileStatus, DataWorkspaceStatus } from "@/types/csv-management";

const pipelineSteps = [
  {
    title: "Upload client files",
    description: "Store vendor-delivered CSV files inside a client-specific workspace.",
    icon: Upload,
  },
  {
    title: "Validate structure",
    description: "Check required columns, file pairings, and dashboard compatibility before publish.",
    icon: CheckCircle2,
  },
  {
    title: "Map to dashboards",
    description: "Attach each approved file set to the specific client dashboards that should use it.",
    icon: Link2,
  },
  {
    title: "Publish securely",
    description: "Make the configured dashboard or report available only inside that client's portal environment.",
    icon: ShieldCheck,
  },
];

function statusVariant(status: DataWorkspaceStatus) {
  switch (status) {
    case "ready":
      return "success";
    case "demo":
      return "default";
    default:
      return "warning";
  }
}

function statusLabel(status: DataWorkspaceStatus) {
  switch (status) {
    case "ready":
      return "CSV ready";
    case "demo":
      return "Demo workspace";
    default:
      return "Needs setup";
  }
}

function fileStatusVariant(status: DataFileStatus) {
  switch (status) {
    case "configured":
      return "success";
    case "sample":
      return "default";
    default:
      return "secondary";
  }
}

function renderWorkspaceCard(workspace: ClientDataWorkspace) {
  return (
    <Card key={workspace.clientId} className="rounded-[28px] border-[#D7E0E5]">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{workspace.clientName}</CardTitle>
            <CardDescription className="mt-2">
              {workspace.notes}
            </CardDescription>
          </div>
          <Badge variant={statusVariant(workspace.status)}>{statusLabel(workspace.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Source of truth
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{workspace.sourceOfTruth}</p>
          </div>
          <div className="rounded-2xl bg-surface-2 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Storage target
            </p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{workspace.storageTarget}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Expected files
          </p>
          <div className="mt-3 space-y-3">
            {workspace.files.map((file) => (
              <div
                key={file.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-nsp-blue-50 text-nsp-blue-600">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{file.label}</p>
                    <p className="mt-1 text-sm text-text-secondary">{file.description}</p>
                  </div>
                </div>
                <Badge variant={fileStatusVariant(file.status)}>
                  {file.status === "configured"
                    ? "Configured"
                    : file.status === "sample"
                      ? "Sample"
                      : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Linked dashboards
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {workspace.linkedDashboards.length > 0 ? (
              workspace.linkedDashboards.map((dashboard) => (
                <Badge key={dashboard} variant="outline" className="px-3 py-1 text-xs">
                  {dashboard}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-text-secondary">
                No dashboards mapped yet.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DataPage() {
  const workspaces = await getFirebaseDataWorkspaces();
  const csvReadyCount = workspaces.filter((workspace) => workspace.status === "ready").length;
  const demoCount = workspaces.filter((workspace) => workspace.status === "demo").length;
  const linkedDashboardCount = workspaces.reduce(
    (sum, workspace) => sum + workspace.linkedDashboards.length,
    0
  );
  const missingFileCount = workspaces.reduce(
    (sum, workspace) =>
      sum +
      workspace.files.filter((file) => file.status === "missing").length,
    0
  );

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Data</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage client CSV workspaces and define the source of truth for each portal environment.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-4">
        {[
          { label: "Client Workspaces", value: workspaces.length, icon: FolderKanban },
          { label: "CSV Ready", value: csvReadyCount, icon: CheckCircle2 },
          { label: "Linked Dashboards", value: linkedDashboardCount, icon: Link2 },
          { label: "Missing Files", value: missingFileCount, icon: AlertTriangle },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-[24px] border-[#D7E0E5]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nsp-blue-50 text-nsp-blue-600">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border-[#D7E0E5]">
          <CardHeader>
            <CardTitle>Preferred CSV Workflow</CardTitle>
            <CardDescription>
              This is the architecture I am building toward so CSV can remain your editable source of truth without creating client cross-contamination.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {pipelineSteps.map((step) => (
                <div key={step.title} className="rounded-[24px] bg-surface-2 px-5 py-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-nsp-blue-600 shadow-sm">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-text-primary">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-[#D7E0E5]">
          <CardHeader>
            <CardTitle>Architecture Notes</CardTitle>
            <CardDescription>
              Why this is the cleanest next step for your portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] bg-surface-2 px-5 py-5">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-nsp-blue-600" />
                <p className="text-sm font-semibold text-text-primary">Client isolation first</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Each client workspace is being modeled as its own container so dashboards, files, and future permissions can remain fully separate.
              </p>
            </div>
            <div className="rounded-[24px] bg-surface-2 px-5 py-5">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-nsp-blue-600" />
                <p className="text-sm font-semibold text-text-primary">CSV remains editable</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                The intended model keeps CSV as the human-editable source of truth while the portal handles validation, mapping, and secure presentation.
              </p>
            </div>
            <div className="rounded-[24px] bg-surface-2 px-5 py-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-nsp-yellow-500" />
                <p className="text-sm font-semibold text-text-primary">Current gap</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                We still need file upload, validation rules, and persistent storage wiring before this becomes a full in-tool CSV management system.
              </p>
            </div>
            <div className="rounded-[24px] border border-nsp-blue-100 bg-nsp-blue-50/40 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nsp-blue-700">
                Current registry snapshot
              </p>
              <p className="mt-3 text-sm text-text-secondary">
                {csvReadyCount} live-ready client workspace{csvReadyCount === 1 ? "" : "s"}, {demoCount} demo environment, and {missingFileCount} missing file slot{missingFileCount === 1 ? "" : "s"} still to configure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-[28px] border-[#D7E0E5]">
        <CardHeader>
          <CardTitle>Client Data Workspaces</CardTitle>
          <CardDescription>
            These are the portal environments that will eventually hold each client&apos;s CSV source files, dashboard mappings, and publishing rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-2">
          {workspaces.map((workspace) => renderWorkspaceCard(workspace))}
        </CardContent>
      </Card>
    </>
  );
}
