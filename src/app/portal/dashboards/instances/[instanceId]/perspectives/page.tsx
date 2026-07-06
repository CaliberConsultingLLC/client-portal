import { notFound } from "next/navigation";
import { DashboardInstancePerspectivesView } from "@/components/portal/dashboard-instance-perspectives-view";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";
import {
  getDashboardPerspectiveInstancesByDashboardId,
  getPerspectiveLibraryMap,
} from "@/lib/firebase/perspective-store";

interface DashboardInstancePerspectivesPageProps {
  params: Promise<{
    instanceId: string;
  }>;
}

export default async function DashboardInstancePerspectivesPage({
  params,
}: DashboardInstancePerspectivesPageProps) {
  const { instanceId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const [instance, perspectiveInstances, libraryById] = await Promise.all([
    getFirebaseDashboardInstanceById(instanceId),
    getDashboardPerspectiveInstancesByDashboardId(instanceId),
    getPerspectiveLibraryMap(),
  ]);

  if (!instance) {
    notFound();
  }

  return (
    <DashboardInstancePerspectivesView
      instanceId={instanceId}
      dashboardTitle={instance.title}
      perspectiveInstances={perspectiveInstances}
      libraryById={libraryById}
    />
  );
}
