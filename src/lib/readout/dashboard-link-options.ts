import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";
import {
  getFirebaseDashboardAssignments,
  getFirebaseDashboardInstances,
} from "@/lib/firebase/dashboard-store";
import type { PortalDashboardFamily } from "@/types/portal";
import {
  READOUT_COLLAB_PERSPECTIVE_OPTIONS,
  READOUT_EE_PERSPECTIVE_OPTIONS,
} from "@/lib/readout/deck-constants";

export type ReadoutDashboardPickerItem = {
  assetId: string;
  title: string;
  href: string;
  family: PortalDashboardFamily;
  instanceId: string;
};

export type ReadoutDashboardLinkOptions = {
  dashboards: ReadoutDashboardPickerItem[];
  campaigns: string[];
  eePerspectives: Array<{ id: string; label: string }>;
  collabPerspectives: Array<{ id: string; label: string }>;
};

export async function getReadoutDashboardLinkOptions(
  clientId: string
): Promise<ReadoutDashboardLinkOptions> {
  const [assignments, instances] = await Promise.all([
    getFirebaseDashboardAssignments(),
    getFirebaseDashboardInstances(),
  ]);
  const instanceMap = new Map(instances.map((instance) => [instance.id, instance]));

  const dashboards = assignments
    .filter(
      (assignment) =>
        assignment.clientId === clientId &&
        assignment.published &&
        assignment.status !== "hidden"
    )
    .map((assignment) => {
      const instance = instanceMap.get(assignment.dashboardInstanceId);
      return {
        assetId: assignment.assetId,
        title: assignment.title,
        href: assignment.href,
        family: instance?.family ?? ("employee_experience" as PortalDashboardFamily),
        instanceId: assignment.dashboardInstanceId,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  let campaigns: string[] = [];
  try {
    const data = await loadDwsEmployeeExperienceDashboardData({
      sourceClientId: clientId,
    });
    campaigns = data.meta.campaigns ?? [];
  } catch {
    campaigns = [];
  }

  return {
    dashboards,
    campaigns,
    eePerspectives: READOUT_EE_PERSPECTIVE_OPTIONS.map((p) => ({
      id: p.id,
      label: p.label,
    })),
    collabPerspectives: READOUT_COLLAB_PERSPECTIVE_OPTIONS.map((p) => ({
      id: p.id,
      label: p.label,
    })),
  };
}
