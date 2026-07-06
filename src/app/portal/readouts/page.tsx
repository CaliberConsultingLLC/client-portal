import { notFound } from "next/navigation";
import { ReadoutList } from "@/components/admin/readout-list";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { getFirebaseReadouts } from "@/lib/firebase/readout-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { listSurveyWavesForSourceClients } from "@/lib/firebase/survey-waves";
import type { PortalDashboardAccessGrant, PortalDashboardInstance } from "@/types/portal";

type DirectoryInstance = PortalDashboardInstance & {
  accessGrants: PortalDashboardAccessGrant[];
};

function sourceClientIdsForPortalClient(clientId: string, instances: DirectoryInstance[]): string[] {
  const sourceIds = new Set<string>();

  for (const instance of instances) {
    for (const grant of instance.accessGrants) {
      if (grant.clientId !== clientId || grant.status === "hidden") {
        continue;
      }

      const sourceClientId = instance.dataSource?.sourceClientId?.trim();
      if (sourceClientId) {
        sourceIds.add(sourceClientId);
      }
    }
  }

  return Array.from(sourceIds);
}

export default async function PortalReadoutsPage() {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const [clients, readouts, { instances }] = await Promise.all([
    getFirebasePortalClients(),
    getFirebaseReadouts(),
    getDashboardDirectoryEntries(),
  ]);

  const directoryInstances = instances as DirectoryInstance[];
  const allSourceClientIds = [
    ...new Set(
      clients.flatMap((client) => sourceClientIdsForPortalClient(client.id, directoryInstances))
    ),
  ];
  const surveyWaveSources = await listSurveyWavesForSourceClients(allSourceClientIds);
  const wavesBySourceId = new Map(surveyWaveSources.map((source) => [source.sourceClientId, source.waves]));

  const surveyWavesByClientId = Object.fromEntries(
    clients.map((client) => {
      const sourceIds = sourceClientIdsForPortalClient(client.id, directoryInstances);
      const merged = new Map<string, true>();

      for (const sourceId of sourceIds) {
        for (const wave of wavesBySourceId.get(sourceId) ?? []) {
          merged.set(wave, true);
        }
      }

      return [client.id, Array.from(merged.keys())] as const;
    })
  );

  const initialClientId = clients[0]?.id ?? "";

  return (
    <ReadoutList
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      surveyWavesByClientId={surveyWavesByClientId}
      readouts={readouts}
      initialClientId={initialClientId}
      basePath="/portal/readouts"
    />
  );
}
