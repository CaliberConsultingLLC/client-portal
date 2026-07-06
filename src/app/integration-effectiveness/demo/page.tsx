import { loadCanopyIntegrationDashboardData } from "@/lib/integration-effectiveness/canopy-demo";
import { getDashboardPerspectiveInstancesByDashboardId } from "@/lib/firebase/perspective-store";
import { IntegrationEffectivenessDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function IntegrationEffectivenessDemoPage() {
  const [data, perspectiveInstances] = await Promise.all([
    loadCanopyIntegrationDashboardData({ demo: true }),
    getDashboardPerspectiveInstancesByDashboardId("integration-demo-instance"),
  ]);

  return (
    <IntegrationEffectivenessDashboardClient
      data={data}
      perspectiveInstances={perspectiveInstances}
    />
  );
}
