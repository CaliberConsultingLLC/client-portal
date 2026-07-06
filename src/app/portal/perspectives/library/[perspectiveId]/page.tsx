import { notFound } from "next/navigation";
import { PerspectiveProductWorkbench } from "@/components/portal/perspective-product-workbench";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getDashboardDirectoryEntries, getFirebaseDashboards } from "@/lib/firebase/dashboard-store";
import {
  getDashboardPerspectiveInstances,
  getPerspectiveLibraryItemById,
} from "@/lib/firebase/perspective-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";

interface PerspectiveLibraryDetailPageProps {
  params: Promise<{
    perspectiveId: string;
  }>;
}

export default async function PerspectiveLibraryDetailPage({
  params,
}: PerspectiveLibraryDetailPageProps) {
  const { perspectiveId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const perspective = await getPerspectiveLibraryItemById(perspectiveId);

  if (!perspective) {
    notFound();
  }

  const [dashboards, dashboardDirectory, clients] = await Promise.all([
    getFirebaseDashboards(),
    getDashboardDirectoryEntries(),
    getFirebasePortalClients(),
  ]);
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const compatibleDashboardInstances = dashboardDirectory.instances
    .filter((instance) => instance.dashboardId === perspective.dashboardId)
    .map((instance) => ({
      id: instance.id,
      title: instance.title,
      clientNames: instance.accessGrants
        .filter((grant) => grant.status !== "hidden")
        .map((grant) => clientById.get(grant.clientId)?.name ?? grant.clientId),
      status: instance.settings.status,
    }));
  const allPerspectiveInstances = await getDashboardPerspectiveInstances();
  const instances = allPerspectiveInstances
    .filter((instance) => instance.libraryItemId === perspective.id)
    .map((instance) => {
      const dashboardInstance = dashboardDirectory.instances.find(
        (entry) => entry.id === instance.dashboardInstanceId
      );
      const status: "active" | "inactive" =
        instance.status === "active" && dashboardInstance?.settings.status === "active"
          ? "active"
          : "inactive";

      return {
        id: instance.id,
        title: instance.title,
        clientNames:
          dashboardInstance?.accessGrants
            .filter((grant) => grant.status !== "hidden")
            .map((grant) => clientById.get(grant.clientId)?.name ?? grant.clientId) ?? [],
        status,
        dashboardInstanceId: instance.dashboardInstanceId,
      };
    });

  return (
    <PerspectiveProductWorkbench
      mode="edit"
      perspective={perspective}
      dashboards={dashboards}
      dashboardInstances={compatibleDashboardInstances}
      instances={instances}
    />
  );
}
