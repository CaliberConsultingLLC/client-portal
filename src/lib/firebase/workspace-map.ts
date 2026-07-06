import type { PortalDashboardAccessGrant, PortalDashboardInstance } from "@/types/portal";
import { listCampaignsForClientIds } from "./campaign-store";
import { getDashboardDirectoryEntries } from "./dashboard-store";
import { getFirebaseDataWorkspaces, getFirebasePortalClients } from "./portal-store";
import { getFirebaseReadoutsByClientId } from "./readout-store";
import {
  flattenSurveyWaves,
  listSurveyWavesForSourceClients,
  type SurveyWaveSource,
} from "./survey-waves";
import { auditDashboardInstanceIds } from "./id-registry-audit";
import { listFirebaseUsersByClientId } from "./user-store";

export interface WorkspaceMapDashboardRow {
  grantId: string;
  instanceId: string;
  templateId: string;
  assetId: string;
  title: string;
  href: string;
  grantStatus: PortalDashboardAccessGrant["status"];
  published: boolean;
  dataSourceKind: string;
  sourceClientId: string | null;
  dataSourceLabel: string;
  instanceStatus: string;
  perspectiveCount: number;
  hiddenDimensions: string[];
}

export interface WorkspaceMapFileRow {
  label: string;
  status: string;
  description: string;
}

export interface ClientWorkspaceMap {
  clientId: string;
  clientName: string;
  isDemo: boolean;
  dashboards: WorkspaceMapDashboardRow[];
  files: WorkspaceMapFileRow[];
  configuredFileCount: number;
  missingFileCount: number;
  storageTarget: string | null;
  activeUserCount: number;
  /** Survey waves parsed from CSV database files (analytics). */
  surveyWaveCount: number;
  surveyWaves: string[];
  surveyWaveSources: SurveyWaveSource[];
  /** Firestore live fielding records (SurveyMonkey + census). */
  liveFieldingCount: number;
  latestLiveFieldingLabel: string | null;
  publishedReadoutName: string | null;
  readoutCount: number;
}

type DirectoryInstance = PortalDashboardInstance & {
  perspectiveCount: number;
  accessGrants: PortalDashboardAccessGrant[];
};

function buildDashboardRows(clientId: string, instances: DirectoryInstance[]): WorkspaceMapDashboardRow[] {
  const rows: WorkspaceMapDashboardRow[] = [];

  for (const instance of instances) {
    for (const grant of instance.accessGrants) {
      if (grant.clientId !== clientId || grant.status === "hidden") {
        continue;
      }

      rows.push({
        grantId: grant.id,
        instanceId: instance.id,
        templateId: instance.dashboardId,
        assetId: instance.assetId,
        title: instance.title,
        href: `/portal/dashboards/${instance.assetId}`,
        grantStatus: grant.status,
        published: grant.published,
        dataSourceKind: instance.dataSource?.kind ?? "unknown",
        sourceClientId: instance.dataSource?.sourceClientId ?? null,
        dataSourceLabel: instance.dataSource?.label ?? "—",
        instanceStatus: instance.settings?.status ?? "unknown",
        perspectiveCount: instance.perspectiveCount ?? 0,
        hiddenDimensions: instance.settings?.hiddenDimensionIds ?? [],
      });
    }
  }

  return rows.sort((left, right) => left.title.localeCompare(right.title));
}

export async function buildClientWorkspaceMaps(): Promise<ClientWorkspaceMap[]> {
  const [clients, { instances }, workspaces] = await Promise.all([
    getFirebasePortalClients(),
    getDashboardDirectoryEntries(),
    getFirebaseDataWorkspaces(),
  ]);

  const workspaceByClientId = new Map(workspaces.map((workspace) => [workspace.clientId, workspace]));
  const clientIds = clients.map((client) => client.id);
  const campaigns = await listCampaignsForClientIds(clientIds);

  const maps = await Promise.all(
    clients.map(async (client) => {
      const workspace = workspaceByClientId.get(client.id);
      const files =
        workspace?.files.map((file) => ({
          label: file.label,
          status: file.status,
          description: file.description,
        })) ?? [];
      const configuredFileCount = files.filter(
        (file) => file.status === "configured" || file.status === "sample"
      ).length;
      const missingFileCount = files.filter((file) => file.status === "missing").length;
      const clientCampaigns = campaigns.filter((campaign) => campaign.clientId === client.id);
      const readouts = await getFirebaseReadoutsByClientId(client.id);
      const users = await listFirebaseUsersByClientId(client.id);
      const publishedReadout = readouts.find((readout) => readout.status === "published") ?? null;
      const dashboardRows = buildDashboardRows(client.id, instances as DirectoryInstance[]);
      const sourceClientIds = [
        ...new Set(
          dashboardRows
            .map((row) => row.sourceClientId)
            .filter((value): value is string => Boolean(value))
        ),
      ];
      const surveyWaveSources = await listSurveyWavesForSourceClients(sourceClientIds);
      const surveyWaves = flattenSurveyWaves(surveyWaveSources);

      return {
        clientId: client.id,
        clientName: client.name,
        isDemo: Boolean(client.isDemo),
        dashboards: dashboardRows,
        files,
        configuredFileCount,
        missingFileCount,
        storageTarget: workspace?.storageTarget ?? null,
        activeUserCount: users.filter((user) => user.isActive).length,
        surveyWaveCount: surveyWaves.length,
        surveyWaves,
        surveyWaveSources,
        liveFieldingCount: clientCampaigns.length,
        latestLiveFieldingLabel: clientCampaigns[0]?.surveyLabel ?? null,
        publishedReadoutName: publishedReadout?.name ?? null,
        readoutCount: readouts.length,
      } satisfies ClientWorkspaceMap;
    })
  );

  return maps.sort((left, right) => left.clientName.localeCompare(right.clientName));
}

export async function buildWorkspaceMapBundle() {
  const [{ instances }, maps] = await Promise.all([
    getDashboardDirectoryEntries(),
    buildClientWorkspaceMaps(),
  ]);

  return {
    maps,
    idAuditFindings: auditDashboardInstanceIds(instances),
  };
}
