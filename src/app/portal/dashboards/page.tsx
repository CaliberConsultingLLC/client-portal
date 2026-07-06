import Link from "next/link";
import { ArrowRight, LayoutPanelTop, Plus } from "lucide-react";
import { AdminDirectoryShell } from "@/components/portal/admin-directory-shell";
import {
  AdminDirectoryOverview,
  AdminDirectorySection,
} from "@/components/portal/admin-directory-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { getAccessibleDashboardAssignments } from "@/lib/firebase/portal-access";
import {
  formatInternalDemoFamilyLabel,
  getInternalDemoLabHref,
  listInternalDemoEnvironments,
} from "@/lib/portal/internal-demo-environments";

function formatStatusLabel(status: string) {
  return status === "active" ? "Active" : "Inactive";
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        isActive ? "bg-[#E7F4EC] text-[#2F6E47]" : "bg-[#F3F4F6] text-[#60727D]"
      }`}
    >
      {formatStatusLabel(status)}
    </span>
  );
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

function normalizeFilterValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeDashboardTitle(value: string) {
  const title = String(value || "").trim();
  const lower = title.toLowerCase();
  if (lower.includes("employee experience")) return "Employee Experience";
  if (lower.includes("integration effectiveness")) return "Integration Effectiveness";
  return title;
}

function DemoStatusBadge({ status }: { status: "ready" | "in_progress" }) {
  const isReady = status === "ready";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        isReady ? "bg-[#E7F4EC] text-[#2F6E47]" : "bg-[#FFF4DF] text-[#8A6A1E]"
      }`}
    >
      {isReady ? "Ready to publish" : "In progress"}
    </span>
  );
}

interface PortalDashboardsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortalDashboardsPage({
  searchParams,
}: PortalDashboardsPageProps) {
  const user = await requireFirebasePortalUser();

  if (isInternalFirebaseRole(user.role)) {
    const resolvedSearchParams = (await searchParams) ?? {};
    const [dashboardDirectory, clients] = await Promise.all([
      getDashboardDirectoryEntries(),
      getFirebasePortalClients(),
    ]);
    const familyFilter = normalizeFilterValue(resolvedSearchParams.family);
    const productStatusFilter = normalizeFilterValue(resolvedSearchParams.productStatus);
    const instanceStatusFilter = normalizeFilterValue(resolvedSearchParams.instanceStatus);
    const sourceFilter = normalizeFilterValue(resolvedSearchParams.source);
    const workspaceFilter = normalizeFilterValue(resolvedSearchParams.workspace);
    const clientById = new Map(clients.map((client) => [client.id, client]));
    const activeClientIds = new Set(
      clients.filter((client) => client.status === "active").map((client) => client.id)
    );
    const demoClientIds = new Set(clients.filter((client) => client.isDemo).map((client) => client.id));
    const filteredDashboards = dashboardDirectory.dashboards.filter((dashboard) => {
      if (familyFilter && dashboard.family !== familyFilter) {
        return false;
      }

      if (productStatusFilter && dashboard.status !== productStatusFilter) {
        return false;
      }

      return true;
    });
    const filteredInstances = dashboardDirectory.instances.filter((instance) => {
      if (familyFilter && instance.family !== familyFilter) {
        return false;
      }

      if (instanceStatusFilter && instance.settings.status !== instanceStatusFilter) {
        return false;
      }

      if (sourceFilter && instance.dataSource.kind !== sourceFilter) {
        return false;
      }

      if (workspaceFilter) {
        const relatedClientIds = instance.accessGrants
          .filter((grant) => grant.status !== "hidden")
          .map((grant) => grant.clientId);
        const hasDemoClient = relatedClientIds.some((clientId) => demoClientIds.has(clientId));
        if (workspaceFilter === "demo" && !hasDemoClient) {
          return false;
        }
        if (workspaceFilter === "live" && hasDemoClient) {
          return false;
        }
      }

      return true;
    });
    const activeInstanceCount = filteredInstances.filter(
      (instance) =>
        instance.settings.status === "active" &&
        instance.accessGrants.some(
          (grant) => grant.status !== "hidden" && activeClientIds.has(grant.clientId)
        )
    ).length;
    const activeFilterCount = [
      familyFilter,
      productStatusFilter,
      instanceStatusFilter,
      sourceFilter,
      workspaceFilter,
    ].filter(Boolean).length;
    const internalDemoEnvironments = listInternalDemoEnvironments();

    return (
      <AdminDirectoryShell
        filters={
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" method="get">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    Family
                  </label>
                  <select
                    name="family"
                    defaultValue={familyFilter}
                    className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                  >
                    <option value="">All families</option>
                    <option value="collaboration">Collaboration</option>
                    <option value="integration">Integration</option>
                    <option value="employee_experience">Employee Experience</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    Product Status
                  </label>
                  <select
                    name="productStatus"
                    defaultValue={productStatusFilter}
                    className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                  >
                    <option value="">All products</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    Instance Status
                  </label>
                  <select
                    name="instanceStatus"
                    defaultValue={instanceStatusFilter}
                    className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                  >
                    <option value="">All instances</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    Data Source
                  </label>
                  <select
                    name="source"
                    defaultValue={sourceFilter}
                    className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                  >
                    <option value="">All sources</option>
                    <option value="firebase_csv_workspace">Firebase CSV</option>
                    <option value="synthetic_demo">Synthetic Demo</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    Workspace Type
                  </label>
                  <select
                    name="workspace"
                    defaultValue={workspaceFilter}
                    className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                  >
                    <option value="">All workspaces</option>
                    <option value="live">Live</option>
                    <option value="demo">Demo</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="submit" className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                    Apply
                  </Button>
                  <Button asChild type="button" variant="outline" className="rounded-full border-[#C9D2D8]">
                    <Link href="/portal/dashboards">Reset</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        }
        sidePanel={
          <div className="space-y-4">
            <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                  Workspace Panel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
                <p>
                  Demo environments stay off client workspaces until you publish them through Assign.
                </p>
                <p>
                  Use the lab links to iterate privately, then assign finished demos to the Demo
                  Environment workspace when they are ready to share.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
                  Quick Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
                <p>{activeFilterCount > 0 ? `${activeFilterCount} active filter(s) applied.` : "No filters applied."}</p>
                <p>
                  Mapping and instance-specific data rules now live under each dashboard instance&apos;s
                  settings page.
                </p>
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-8">
          <AdminDirectoryOverview
            title="Dashboards"
            description="Review reusable dashboard products and the client-facing instances derived from them in one compact admin view."
            metrics={[
              { label: "Dashboard products", value: filteredDashboards.length },
              { label: "Active instances", value: activeInstanceCount },
              { label: "Demo environments", value: internalDemoEnvironments.length },
            ]}
            actions={
              <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                <Link href="/portal/dashboards/library/new">
                  <Plus className="h-4 w-4" />
                  Add dashboard
                </Link>
              </Button>
            }
          />

          <AdminDirectorySection
            title="Dashboard Library"
            description="Reusable dashboard products that can be assigned to clients and managed over time."
            columns={[
              { key: "name", label: "Dashboard" },
              { key: "version", label: "Version" },
              { key: "status", label: "Active" },
              { key: "category", label: "Category" },
              { key: "activeInstances", label: "# Active Instances", className: "text-right" },
              { key: "actions", label: "Actions" },
            ]}
            rows={filteredDashboards.map((dashboard) => {
              const activeInstances = filteredInstances.filter(
                (instance) =>
                  instance.dashboardId === dashboard.id &&
                  instance.settings.status === "active" &&
                  instance.accessGrants.some(
                    (grant) => grant.status !== "hidden" && activeClientIds.has(grant.clientId)
                  )
              ).length;

              return {
                id: dashboard.id,
                cells: [
                  <div key="name">
                    <p className="font-semibold text-[#2B2B2B]">{dashboard.title}</p>
                  </div>,
                  <span key="version" className="font-medium text-[#60727D]">
                    {dashboard.versionLabel ?? "v.1.0"}
                  </span>,
                  <StatusBadge key="status" status={dashboard.status} />,
                  <span key="category" className="font-medium text-[#2B2B2B]">
                    {dashboard.categoryLabels?.length
                      ? dashboard.categoryLabels.join(", ")
                      : dashboard.family.replace(/_/g, " ")}
                  </span>,
                  <span key="instances" className="block text-right font-semibold text-[#2B2B2B]">
                    {activeInstances}
                  </span>,
                  <div key="actions" className="flex items-center justify-center gap-2">
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/dashboards/library/${dashboard.id}`}>Manage</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/dashboards/library/${dashboard.id}?mode=assign`}>Assign</Link>
                    </Button>
                  </div>,
                ],
              };
            })}
            emptyMessage="No dashboard products match the current filter selection."
          />

          <AdminDirectorySection
            title="Dashboard Instances"
            description="Client-facing dashboard instances with direct links into their detailed management views."
            columns={[
              { key: "name", label: "Dashboard Instance" },
              { key: "version", label: "Version" },
              { key: "client", label: "Client Name" },
              { key: "status", label: "Active" },
              { key: "lastUsed", label: "Last Date Used" },
              { key: "actions", label: "Actions" },
            ]}
            rows={filteredInstances.map((entry) => {
              const clientNames = entry.accessGrants
                .filter((grant) => grant.status !== "hidden")
                .map((grant) => clientById.get(grant.clientId)?.name ?? grant.clientId);

              return {
                id: entry.id,
                cells: [
                  <div key="name" className="space-y-1">
                    <Link
                      href={`/portal/dashboards/instances/${entry.id}/information`}
                      className="inline-flex items-center gap-2 font-semibold text-[#2B2B2B] hover:text-[#386B45]"
                    >
                      {entry.title}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#60727D]">
                      {entry.dashboard?.title ?? entry.dashboardId}
                    </p>
                  </div>,
                  <span key="version" className="font-medium text-[#60727D]">
                    {entry.dashboard?.versionLabel ?? "v.1.0"}
                  </span>,
                  <span key="client" className="font-medium text-[#2B2B2B]">
                    {clientNames.length > 0 ? clientNames.join(", ") : "Unassigned"}
                  </span>,
                  <StatusBadge key="status" status={entry.settings.status} />,
                  <span key="lastUsed" className="font-medium text-[#60727D]">
                    {formatDateLabel(entry.lastUsedAt)}
                  </span>,
                  <div key="actions" className="flex items-center justify-center gap-2">
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/dashboards/instances/${entry.id}/information`}>Manage</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/dashboards/instances/${entry.id}/access`}>Assign</Link>
                    </Button>
                  </div>,
                ],
              };
            })}
            emptyMessage="No dashboard instances match the current filter selection."
          />

          <AdminDirectorySection
            title="Demo Environments"
            description="Internal-only lab previews for iterating on dashboard experiences before assigning them to a client or demo workspace."
            columns={[
              { key: "name", label: "Environment" },
              { key: "family", label: "Family" },
              { key: "source", label: "Data Source" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={internalDemoEnvironments.map((environment) => ({
              id: environment.id,
              cells: [
                <div key="name" className="space-y-1">
                  <p className="font-semibold text-[#2B2B2B]">{environment.title}</p>
                  <p className="text-sm leading-relaxed text-[#60727D]">{environment.description}</p>
                </div>,
                <span key="family" className="font-medium capitalize text-[#2B2B2B]">
                  {formatInternalDemoFamilyLabel(environment.family)}
                </span>,
                <span key="source" className="font-medium text-[#60727D]">
                  {environment.dataSourceLabel}
                </span>,
                <DemoStatusBadge key="status" status={environment.status} />,
                <div key="actions" className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                    <Link href={getInternalDemoLabHref(environment.id)}>
                      Open lab
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  {environment.publishDashboardId ? (
                    <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                      <Link href={`/portal/dashboards/library/${environment.publishDashboardId}?mode=assign`}>
                        Assign
                      </Link>
                    </Button>
                  ) : null}
                </div>,
              ],
            }))}
            emptyMessage="No demo environments are configured yet."
          />
        </div>
      </AdminDirectoryShell>
    );
  }

  const dashboardCards = await getAccessibleDashboardAssignments(user);

  return (
    <AdminDirectoryShell
      filters={
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
              Dashboard Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
            <p>This view lists dashboards currently assigned to your workspace.</p>
            <p>New dashboard assignments will appear here automatically.</p>
          </CardContent>
        </Card>
      }
      sidePanel={
        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B]">
              Dashboard Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
            <p>Open any assigned dashboard directly from the action button.</p>
            <p>Status shows whether that dashboard assignment is active or draft.</p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">Dashboards</p>
          <h1 className="mt-3 text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
            Assigned Dashboards
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
            Launch dashboards currently available to your client workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Assigned Dashboards" value={dashboardCards.length} />
          <SummaryCard
            label="Active Dashboards"
            value={dashboardCards.filter((card) => card.status === "active").length}
          />
          <SummaryCard
            label="Draft Dashboards"
            value={dashboardCards.filter((card) => card.status !== "active").length}
          />
        </div>

        <div className="grid gap-4">
          {dashboardCards.length === 0 ? (
            <Card className="rounded-[28px] border-dashed border-[#D6DEE3] bg-white shadow-sm">
              <CardContent className="px-6 py-12 text-sm text-[#60727D]">
                No dashboards are assigned to your account yet.
              </CardContent>
            </Card>
          ) : null}
          {dashboardCards.map((card) => (
            <Card key={card.id} className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-[#2B2B2B]">
                        {normalizeDashboardTitle(card.title)}
                      </h2>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#F4F7F9] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                        <LayoutPanelTop className="h-3.5 w-3.5" />
                        {card.status === "active" ? "Ready to launch" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#60727D]">{card.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:justify-self-end">
                    <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                      <Link href={card.href}>
                        Open Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminDirectoryShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-2xl font-extrabold text-[#2B2B2B]">{value}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}
