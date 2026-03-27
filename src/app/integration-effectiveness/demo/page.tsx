import { loadCanopyIntegrationDashboardData } from "@/lib/integration-effectiveness/canopy-demo";
import { IntegrationEffectivenessDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function IntegrationEffectivenessDemoPage() {
  const data = loadCanopyIntegrationDashboardData();

  return (
    <IntegrationEffectivenessDashboardClient
      data={data}
    />
  );
}
