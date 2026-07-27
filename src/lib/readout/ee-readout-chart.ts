import { projectCampaignResultsData } from "@/app/employee-experience/dws/ee-live-projections";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { loadDwsEmployeeExperienceDashboardData } from "@/lib/employee-experience/dws-dashboard";
import type { PortalDashboardAccessGrant, PortalDashboardInstance } from "@/types/portal";

type DirectoryInstance = PortalDashboardInstance & {
  accessGrants: PortalDashboardAccessGrant[];
};

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export async function findEmployeeExperienceInstanceForClient(clientId: string) {
  const { instances } = await getDashboardDirectoryEntries();
  const directoryInstances = instances as DirectoryInstance[];

  for (const instance of directoryInstances) {
    if (instance.family !== "employee_experience") {
      continue;
    }

    const grant = instance.accessGrants.find(
      (entry) => entry.clientId === clientId && entry.status !== "hidden"
    );

    if (grant) {
      return instance;
    }
  }

  return null;
}

export async function buildCampaignOverviewFavBarsChart(input: {
  clientId: string;
  surveyWaveLabel?: string | null;
}) {
  const instance = await findEmployeeExperienceInstanceForClient(input.clientId);

  if (!instance) {
    throw new Error("No Employee Experience dashboard is assigned to this client.");
  }

  const sourceClientId = instance.dataSource?.sourceClientId?.trim();
  if (!sourceClientId) {
    throw new Error("Dashboard instance is missing a CSV source client ID.");
  }

  const data = await loadDwsEmployeeExperienceDashboardData({
    sourceClientId,
    hiddenDimensionIds: instance.settings?.hiddenDimensionIds,
  });

  const campaignLabel = input.surveyWaveLabel?.trim() || data.meta.currentCampaignLabel;
  const projection = projectCampaignResultsData(data, { campaignLabel });
  const comparison = projection.comparisons[0] ?? null;

  // Index values and the overall average are the projection's person averages —
  // never a mean of statement scores or a mean of the index values.
  const items = projection.indexes.map((index) => {
    const current = round1(index.score?.current ?? 0);
    const prior = comparison ? index.score?.comparisons?.[comparison.id] : null;
    const delta = typeof prior === "number" ? round1(current - round1(prior)) : undefined;

    return {
      label: index.name,
      value: current,
      ...(delta !== undefined ? { delta } : {}),
    };
  });

  const avg = round1(projection.overallScore?.current ?? 0);
  const values = items.map((item) => item.value);
  const min = values.length > 0 ? Math.floor(Math.min(...values) - 4) : 56;
  const max = values.length > 0 ? Math.ceil(Math.max(...values) + 4) : 80;

  return {
    chartData: {
      avg,
      axis: { min, max, ticks: [min + 4, round1((min + max) / 2), max - 4] },
      items,
    },
    meta: {
      instanceId: instance.id,
      assetId: instance.assetId,
      sourceClientId,
      surveyWaveLabel: campaignLabel,
      comparisonLabel: comparison?.label ?? null,
    },
  };
}
