import type { ReactNode } from "react";
import { CollaborationDemoEnvironment } from "@/components/collaboration/demo-environment";
import { DwsEmployeeExperienceDashboardClient } from "@/app/employee-experience/dws/dashboard-client";
import { IntegrationEffectivenessDashboardClient } from "@/app/integration-effectiveness/demo/dashboard-client";
import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";
import { getDashboardPerspectiveInstancesByDashboardId } from "@/lib/firebase/perspective-store";
import { loadCanopyIntegrationDashboardData } from "@/lib/integration-effectiveness/canopy-demo";
import type { InternalDemoEnvironment } from "@/lib/portal/internal-demo-environments";

export async function renderInternalDemoEnvironment(
  environment: InternalDemoEnvironment
): Promise<ReactNode> {
  switch (environment.id) {
    case "collaboration":
      return <CollaborationDemoEnvironment />;
    case "integration-effectiveness": {
      const [data, perspectiveInstances] = await Promise.all([
        loadCanopyIntegrationDashboardData({ demo: true }),
        getDashboardPerspectiveInstancesByDashboardId(
          environment.previewInstanceId ?? "integration-demo-instance"
        ),
      ]);
      return (
        <IntegrationEffectivenessDashboardClient
          data={data}
          perspectiveInstances={perspectiveInstances}
        />
      );
    }
    case "employee-experience": {
      const data = await loadDwsEmployeeExperienceDashboardData({
        demo: true,
        hiddenDimensionIds: ["acquisition"],
      });
      return <DwsEmployeeExperienceDashboardClient data={data} />;
    }
    default:
      return null;
  }
}
