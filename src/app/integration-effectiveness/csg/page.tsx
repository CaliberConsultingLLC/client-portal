import { loadCanopyIntegrationDashboardData } from "@/lib/integration-effectiveness/canopy-demo";
import { getDashboardPerspectiveInstancesByDashboardId } from "@/lib/firebase/perspective-store";
import { IntegrationEffectivenessDashboardClient } from "../demo/dashboard-client";

export const dynamic = "force-dynamic";

export default async function CanopyIntegrationClientPage() {
  const [data, perspectiveInstances] = await Promise.all([
    loadCanopyIntegrationDashboardData(),
    getDashboardPerspectiveInstancesByDashboardId("csg-integration-instance"),
  ]);

  return <IntegrationEffectivenessDashboardClient data={data} perspectiveInstances={perspectiveInstances} />;
}
