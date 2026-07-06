import { notFound } from "next/navigation";
import { DashboardProductWorkbench } from "@/components/portal/dashboard-product-workbench";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getDashboardDirectoryEntries,
  getFirebaseDashboardById,
} from "@/lib/firebase/dashboard-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";

interface DashboardLibraryDetailPageProps {
  params: Promise<{
    dashboardId: string;
  }>;
}

export default async function DashboardLibraryDetailPage({
  params,
}: DashboardLibraryDetailPageProps) {
  const { dashboardId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const dashboard = await getFirebaseDashboardById(dashboardId);

  if (!dashboard) {
    notFound();
  }

  const [dashboardDirectory, clients] = await Promise.all([
    getDashboardDirectoryEntries(),
    getFirebasePortalClients(),
  ]);
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const instances = dashboardDirectory.instances
    .filter((instance) => instance.dashboardId === dashboard.id)
    .map((instance) => ({
      id: instance.id,
      title: instance.title,
      assetId: instance.assetId,
      status: instance.settings.status,
      clientNames: instance.accessGrants
        .filter((grant) => grant.status !== "hidden")
        .map((grant) => clientById.get(grant.clientId)?.name ?? grant.clientId),
      lastUsedAt: instance.lastUsedAt,
    }));

  return (
    <DashboardProductWorkbench
      mode="edit"
      dashboard={dashboard}
      clients={clients}
      instances={instances}
    />
  );
}
