import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";
import { DwsEmployeeExperienceDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function DwsEmployeeExperiencePage() {
  const data = loadDwsEmployeeExperienceDashboardData();

  return <DwsEmployeeExperienceDashboardClient data={data} />;
}
