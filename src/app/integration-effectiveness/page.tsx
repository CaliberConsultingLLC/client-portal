import { loadCanopyIntegrationDashboardData } from "@/lib/integration-effectiveness/canopy-demo";
import { IntegrationEffectivenessDashboardClient } from "./demo/dashboard-client";

export const dynamic = "force-dynamic";

export default async function IntegrationEffectivenessDemoLabPage() {
  const data = await loadCanopyIntegrationDashboardData({ demo: true });

  return <IntegrationEffectivenessDashboardClient data={data} />;
}
