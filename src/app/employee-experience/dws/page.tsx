import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";
import { DwsEmployeeExperienceDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

type DwsEmployeeExperiencePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isDemoParam(value: string | string[] | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === "true" || normalized === "1" || normalized === "demo";
}

export default async function DwsEmployeeExperiencePage({
  searchParams,
}: DwsEmployeeExperiencePageProps) {
  const params = await searchParams;
  const data = await loadDwsEmployeeExperienceDashboardData({
    demo: isDemoParam(params?.demo),
    hiddenDimensionIds: ["acquisition", "integration"],
  });

  return <DwsEmployeeExperienceDashboardClient data={data} />;
}
