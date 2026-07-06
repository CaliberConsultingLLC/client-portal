import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminDirectoryShell } from "@/components/portal/admin-directory-shell";
import {
  AdminDirectoryOverview,
  AdminDirectorySection,
} from "@/components/portal/admin-directory-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import {
  getDashboardPerspectiveInstances,
  getPerspectiveLibraryItems,
} from "@/lib/firebase/perspective-store";

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        isActive ? "bg-[#E7F4EC] text-[#2F6E47]" : "bg-[#F3F4F6] text-[#60727D]"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function normalizeFilterValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

interface PortalPerspectivesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortalPerspectivesPage({
  searchParams,
}: PortalPerspectivesPageProps) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const [libraryItems, perspectiveInstances, dashboardDirectory, clients] = await Promise.all([
    getPerspectiveLibraryItems(),
    getDashboardPerspectiveInstances(),
    getDashboardDirectoryEntries(),
    getFirebasePortalClients(),
  ]);
  const dashboardById = new Map(
    dashboardDirectory.dashboards.map((dashboard) => [dashboard.id, dashboard])
  );
  const dashboardInstanceById = new Map(
    dashboardDirectory.instances.map((instance) => [instance.id, instance])
  );
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const dashboardFilter = normalizeFilterValue(resolvedSearchParams.dashboard);
  const familyFilter = normalizeFilterValue(resolvedSearchParams.family);
  const productStatusFilter = normalizeFilterValue(resolvedSearchParams.productStatus);
  const instanceStatusFilter = normalizeFilterValue(resolvedSearchParams.instanceStatus);
  const clientFilter = normalizeFilterValue(resolvedSearchParams.client);
  const activeClientIds = new Set(
    clients.filter((client) => client.status === "active").map((client) => client.id)
  );
  const filteredLibraryItems = libraryItems.filter((item) => {
    const dashboard = dashboardById.get(item.dashboardId);

    if (dashboardFilter && item.dashboardId !== dashboardFilter) {
      return false;
    }

    if (familyFilter && item.family !== familyFilter) {
      return false;
    }

    if (productStatusFilter && item.status !== productStatusFilter) {
      return false;
    }

    if (familyFilter && dashboard?.family !== familyFilter) {
      return false;
    }

    return true;
  });
  const filteredLibraryItemIds = new Set(filteredLibraryItems.map((item) => item.id));
  const filteredPerspectiveInstances = perspectiveInstances.filter((instance) => {
    const libraryItem = libraryItems.find((item) => item.id === instance.libraryItemId);
    const dashboardInstance = dashboardInstanceById.get(instance.dashboardInstanceId);

    if (!libraryItem || !filteredLibraryItemIds.has(libraryItem.id)) {
      return false;
    }

    if (instanceStatusFilter && instance.status !== instanceStatusFilter) {
      return false;
    }

    if (clientFilter) {
      const clientIds =
        dashboardInstance?.accessGrants
          .filter((grant) => grant.status !== "hidden")
          .map((grant) => grant.clientId) ?? [];

      if (!clientIds.includes(clientFilter)) {
        return false;
      }
    }

    return true;
  });
  const dashboardCount = new Set(filteredLibraryItems.map((item) => item.dashboardId)).size;
  const activePerspectiveInstanceCount = filteredPerspectiveInstances.filter((instance) => {
    const dashboardInstance = dashboardInstanceById.get(instance.dashboardInstanceId);

    return Boolean(
      instance.status === "active" &&
        dashboardInstance?.settings.status === "active" &&
        dashboardInstance.accessGrants.some(
          (grant) => grant.status !== "hidden" && activeClientIds.has(grant.clientId)
        )
    );
  }).length;
  const activeFilterCount = [
    dashboardFilter,
    familyFilter,
    productStatusFilter,
    instanceStatusFilter,
    clientFilter,
  ].filter(Boolean).length;

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
                  Dashboard
                </label>
                <select
                  name="dashboard"
                  defaultValue={dashboardFilter}
                  className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                >
                  <option value="">All dashboards</option>
                  {dashboardDirectory.dashboards.map((dashboard) => (
                    <option key={dashboard.id} value={dashboard.id}>
                      {dashboard.title}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                  Client
                </label>
                <select
                  name="client"
                  defaultValue={clientFilter}
                  className="mt-2 w-full rounded-2xl border border-[#D6DEE3] bg-white px-4 py-2.5 text-sm text-[#2B2B2B] focus:border-[#386B45] focus:outline-none"
                >
                  <option value="">All clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
                  Apply
                </Button>
                <Button asChild type="button" variant="outline" className="rounded-full border-[#C9D2D8]">
                  <Link href="/portal/perspectives">Reset</Link>
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
                Perspective Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-[#60727D]">
              <p>
                Perspectives are reusable views that sit inside dashboard instances and define the
                specific lens, narrative, or report surface a user can open.
              </p>
              <p>
                Use the center tables to manage product definitions and the dashboard-local instances
                attached to client workspaces.
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
                Perspective products are managed from the library. Client visibility is controlled
                through the dashboard instance where the perspective is adopted.
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-8">
      <AdminDirectoryOverview
        title="Perspectives"
        description="Review reusable perspective products and the dashboard-specific instances attached to client dashboard experiences."
        metrics={[
          { label: "Perspective products", value: filteredLibraryItems.length },
          { label: "Active instances", value: activePerspectiveInstanceCount },
          { label: "Dashboards", value: dashboardCount },
        ]}
        actions={
          <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
            <Link href="/portal/perspectives/library/new">
              <Plus className="h-4 w-4" />
              Add perspective
            </Link>
          </Button>
        }
      />

      <AdminDirectorySection
        title="Perspective Library"
        description="Reusable perspectives grouped by the dashboard product they belong to."
        columns={[
          { key: "name", label: "Perspective Name" },
          { key: "dashboard", label: "Dashboard" },
          { key: "version", label: "Version" },
          { key: "activeInstances", label: "# Active Instances", className: "text-right" },
          { key: "actions", label: "Actions" },
        ]}
        rows={filteredLibraryItems.map((item) => {
          const activeInstances = filteredPerspectiveInstances.filter((instance) => {
            const dashboardInstance = dashboardInstanceById.get(instance.dashboardInstanceId);

            return Boolean(
              instance.libraryItemId === item.id &&
                instance.status === "active" &&
                dashboardInstance?.settings.status === "active" &&
                dashboardInstance.accessGrants.some(
                  (grant) => grant.status !== "hidden" && activeClientIds.has(grant.clientId)
                )
            );
          }).length;
          const dashboard = dashboardById.get(item.dashboardId);

          return {
            id: item.id,
            cells: [
              <span key="name" className="font-semibold text-[#2B2B2B]">
                {item.title}
              </span>,
              <span key="dashboard" className="font-medium text-[#2B2B2B]">
                {dashboard?.title ?? item.dashboardId}
              </span>,
              <span key="version" className="font-medium text-[#60727D]">
                {item.versionLabel ?? "v.1.0"}
              </span>,
              <span key="instances" className="block text-right font-semibold text-[#2B2B2B]">
                {activeInstances}
              </span>,
              <div key="actions" className="flex items-center justify-center gap-2">
                <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                  <Link href={`/portal/perspectives/library/${item.id}`}>Manage</Link>
                </Button>
              </div>,
            ],
          };
        })}
        emptyMessage="No perspective products are available yet."
      />

      <AdminDirectorySection
        title="Perspective Instances"
        description="Dashboard-local perspective instances tied to client dashboard instances."
        columns={[
          { key: "name", label: "Perspective Name" },
          { key: "dashboard", label: "Dashboard" },
          { key: "version", label: "Version" },
          { key: "client", label: "Client Name" },
          { key: "status", label: "Active" },
          { key: "actions", label: "Actions" },
        ]}
        rows={filteredPerspectiveInstances.map((instance) => {
          const dashboardInstance = dashboardInstanceById.get(instance.dashboardInstanceId);
          const libraryItem = libraryItems.find((item) => item.id === instance.libraryItemId);
          const dashboard = libraryItem ? dashboardById.get(libraryItem.dashboardId) : null;
          const clientNames =
            dashboardInstance?.accessGrants
              .filter((grant) => grant.status !== "hidden")
              .map((grant) => clientById.get(grant.clientId)?.name ?? grant.clientId) ?? [];
          const isActive = instance.status === "active" && dashboardInstance?.settings.status === "active";

          return {
            id: instance.id,
            cells: [
              <div key="name" className="space-y-1">
                <Link
                  href={`/portal/dashboards/instances/${instance.dashboardInstanceId}/perspectives`}
                  className="inline-flex items-center gap-2 font-semibold text-[#2B2B2B] hover:text-[#386B45]"
                >
                  {instance.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>,
              <span key="dashboard" className="font-medium text-[#2B2B2B]">
                {dashboard?.title ?? dashboardInstance?.dashboard?.title ?? "Unknown"}
              </span>,
              <span key="version" className="font-medium text-[#60727D]">
                {libraryItem?.versionLabel ?? "v.1.0"}
              </span>,
              <span key="client" className="font-medium text-[#2B2B2B]">
                {clientNames.length > 0 ? clientNames.join(", ") : "Unassigned"}
              </span>,
              <StatusBadge key="status" status={isActive ? "active" : "inactive"} />,
              <div key="actions" className="flex items-center justify-center gap-2">
                <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                  <Link href={`/portal/dashboards/instances/${instance.dashboardInstanceId}/perspectives`}>
                    Manage
                  </Link>
                </Button>
              </div>,
            ],
          };
        })}
        emptyMessage="No perspective instances have been created yet."
      />
      </div>
    </AdminDirectoryShell>
  );
}
