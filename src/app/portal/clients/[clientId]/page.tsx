import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Users,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { canManageClientUsers, getAccessibleClientWorkspace } from "@/lib/firebase/portal-access";
import { listFirebaseUsersByClientId } from "@/lib/firebase/user-store";

interface ClientWorkspacePageProps {
  params: Promise<{
    clientId: string;
  }>;
}

function formatDashboardType(assetId: string) {
  const base = assetId.split("--")[0] ?? assetId;
  const normalized = base
    .replace(/-dashboard$/i, "")
    .replace(/-/g, " ")
    .trim();

  if (!normalized) {
    return "Dashboard";
  }

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatWorkspaceDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ClientWorkspacePage({ params }: ClientWorkspacePageProps) {
  const { clientId } = await params;
  const user = await requireFirebasePortalUser();
  const [workspaceAccess, workspaceUsers] = await Promise.all([
    getAccessibleClientWorkspace(user, clientId),
    listFirebaseUsersByClientId(clientId),
  ]);

  if (!workspaceAccess) {
    notFound();
  }

  const { client, workspace, assignments } = workspaceAccess;
  const configuredFiles =
    workspace?.files.filter((file) => file.status === "configured" || file.status === "sample") ?? [];
  const missingFiles = workspace?.files.filter((file) => file.status === "missing") ?? [];
  const activeUsers = workspaceUsers.filter((workspaceUser) => workspaceUser.isActive);
  const canManageUsers = canManageClientUsers(user, clientId);
  const isInternal = isInternalFirebaseRole(user.role);
  const isClientAdmin = user.role === "client_admin";
  // Average client viewers (executive/management/employee) get a stripped-down
  // workspace that goes straight to their assigned dashboards.
  const isStreamlinedViewer = !isInternal && !isClientAdmin;

  if (isStreamlinedViewer) {
    const publishedAssignments = assignments.filter((assignment) => assignment.published);

    return (
      <PortalContentFrame centerMaxWidthClassName="max-w-[1440px]">
        <div className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Client Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              {client.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              This workspace is intended for your client-specific dashboards, data sources, and
              documents. Open a dashboard below to get started.
            </p>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#8798AA] bg-white shadow-[0_18px_40px_-30px_rgba(21,34,56,0.45)]">
            <div className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#E2E8EF] bg-[#E2E8EF] px-6 py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                Assigned dashboard
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                Type
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                Updated
              </span>
              <span className="sr-only">Open</span>
            </div>

            {publishedAssignments.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-[#60727D]">
                No dashboards have been assigned to your workspace yet.
              </div>
            ) : (
              publishedAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={assignment.href}
                  className="group grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 border-b border-[#D3DDE7] px-6 py-6 transition-colors last:border-b-0 hover:bg-[#F5F8FA]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-[#2B2B2B]">
                      {assignment.title}
                    </p>
                    {assignment.description ? (
                      <p className="mt-1 truncate text-sm text-[#60727D]">
                        {assignment.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm font-medium text-[#2B2B2B]">
                    {formatDashboardType(assignment.assetId)}
                  </span>
                  <span className="text-sm text-[#60727D]">
                    {formatWorkspaceDate(assignment.updatedAt)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#C9D2D8] px-4 py-2 text-sm font-medium text-[#2B2B2B] transition-colors group-hover:border-[#386B45] group-hover:bg-[#386B45] group-hover:text-white">
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </PortalContentFrame>
    );
  }

  return (
    <PortalContentFrame>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Client Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              {client.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              This workspace is the container for client-specific dashboards, CSV-backed data
              sources, documents, and eventual publishing controls.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={client.status === "active" ? "success" : "secondary"}>
              {client.status === "active" ? "Active Workspace" : "Draft Workspace"}
            </Badge>
            {isInternal ? (
              <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                <Link href={`/portal/workspace-map?clientId=${encodeURIComponent(client.id)}`}>
                  <MapPin className="h-4 w-4" />
                  Workspace map
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

      <div className="grid gap-5 md:grid-cols-4">
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <BarChart3 className="h-5 w-5 text-[#386B45]" />
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{assignments.length}</p>
              <p className="text-xs text-[#60727D]">Assigned dashboards</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <FileSpreadsheet className="h-5 w-5 text-[#386B45]" />
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{configuredFiles.length}</p>
              <p className="text-xs text-[#60727D]">Configured files</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <Users className="h-5 w-5 text-[#386B45]" />
            <div>
              <p className="text-2xl font-extrabold text-[#2B2B2B]">{activeUsers.length}</p>
              <p className="text-xs text-[#60727D]">Active Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-5 w-5 text-[#386B45]" />
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#2B2B2B]">
                {client.id}
              </p>
              <p className="text-xs text-[#60727D]">Workspace key</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Assigned dashboards</CardTitle>
            <CardDescription className="text-[#60727D]">
              Dashboards published or prepared for this specific client environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.length === 0 ? (
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm text-[#60727D]">
                No dashboards are assigned to this workspace yet.
              </div>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-[#D6DEE3] bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#2B2B2B]">{assignment.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                        {assignment.description}
                      </p>
                    </div>
                    <Badge variant={assignment.published ? "success" : "secondary"}>
                      {assignment.published ? "Published" : "Hidden Draft"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={assignment.href}>
                        Open dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    {isInternal && assignment.assetId.includes("employee-experience") && (
                      <Button asChild variant="ghost" className="rounded-full text-[#60727D] hover:text-[#2B2B2B]">
                        <Link href={`/portal/dashboards/instances/${assignment.dashboardInstanceId}/data-map`}>
                          <MapPin className="h-4 w-4" />
                          Data Map
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#2B2B2B]">Active Users</CardTitle>
              <CardDescription className="text-[#60727D]">
                Client-specific portal users and a minimal starting point for account management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                  Current active users
                </p>
                <p className="mt-2 text-3xl font-extrabold text-[#2B2B2B]">{activeUsers.length}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                  Add, edit, and reset user credentials for this client workspace from a dedicated
                  management page.
                </p>
              </div>
              {workspaceUsers.length > 0 ? (
                <div className="space-y-2">
                  {workspaceUsers.slice(0, 3).map((workspaceUser) => (
                    <div
                      key={workspaceUser.uid}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-[#F5F8FA] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#2B2B2B]">{workspaceUser.fullName}</p>
                        <p className="text-xs text-[#60727D]">{workspaceUser.email}</p>
                      </div>
                      <Badge variant={workspaceUser.isActive ? "success" : "secondary"}>
                        {workspaceUser.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm text-[#60727D]">
                  No users are assigned to this workspace yet.
                </div>
              )}
              {canManageUsers ? (
                <Button asChild className="w-full rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                  <Link href={`/portal/clients/${client.id}/users`}>
                    Manage users
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-3 text-sm text-[#60727D]">
                  User management is available to internal admins and assigned client admins.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#2B2B2B]">Data workspace</CardTitle>
              <CardDescription className="text-[#60727D]">
                Source-of-truth information for this client&apos;s CSV-backed data environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                  Source of truth
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2B2B2B]">
                  {workspace?.sourceOfTruth ?? "Not configured yet"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                  Storage target
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2B2B2B]">
                  {workspace?.storageTarget ?? "Not configured yet"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#60727D]">
                  {workspace?.notes ?? "This workspace has not been fully configured yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#2B2B2B]">Expected files</CardTitle>
              <CardDescription className="text-[#60727D]">
                File slots currently defined for this client workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(workspace?.files ?? []).map((file) => (
                <div key={file.id} className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#2B2B2B]">{file.label}</p>
                      <p className="mt-1 text-sm text-[#60727D]">{file.description}</p>
                    </div>
                    <Badge
                      variant={
                        file.status === "configured"
                          ? "success"
                          : file.status === "sample"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {file.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!workspace ? (
                <div className="rounded-2xl bg-[#F5F8FA] px-4 py-4 text-sm text-[#60727D]">
                  No data workspace document has been configured for this client yet.
                </div>
              ) : null}
              {missingFiles.length > 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D6DEE3] px-4 py-4 text-sm text-[#60727D]">
                  {missingFiles.length} file slot{missingFiles.length === 1 ? "" : "s"} still marked as
                  missing in this workspace definition.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PortalContentFrame>
  );
}
