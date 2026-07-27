import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ReadoutDetailsShell } from "@/components/admin/readout-details-shell";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getDashboardDirectoryEntries } from "@/lib/firebase/dashboard-store";
import { getFirebaseReadoutById } from "@/lib/firebase/readout-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { listFirebaseUsersByClientId } from "@/lib/firebase/user-store";
import { listSurveyWavesForSourceClients } from "@/lib/firebase/survey-waves";
import type { PortalDashboardAccessGrant, PortalDashboardInstance } from "@/types/portal";

type DirectoryInstance = PortalDashboardInstance & {
  accessGrants: PortalDashboardAccessGrant[];
};

export default async function PortalReadoutDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const { id } = await params;
  const [readout, clients, { instances }] = await Promise.all([
    getFirebaseReadoutById(id),
    getFirebasePortalClients(),
    getDashboardDirectoryEntries(),
  ]);

  if (!readout) {
    notFound();
  }

  const clientName = clients.find((client) => client.id === readout.clientId)?.name ?? readout.clientId;
  const clientUsers = (await listFirebaseUsersByClientId(readout.clientId))
    .filter((entry) => entry.isActive)
    .map((entry) => ({
      uid: entry.uid,
      name: entry.fullName || entry.email,
      email: entry.email,
      role: entry.role,
    }));

  const directoryInstances = instances as DirectoryInstance[];
  const sourceIds = new Set<string>();
  for (const instance of directoryInstances) {
    for (const grant of instance.accessGrants) {
      if (grant.clientId !== readout.clientId || grant.status === "hidden") continue;
      const sourceClientId = instance.dataSource?.sourceClientId?.trim();
      if (sourceClientId) sourceIds.add(sourceClientId);
    }
  }
  const surveyWaveSources = await listSurveyWavesForSourceClients([...sourceIds]);
  const surveyWaves = [
    ...new Set(surveyWaveSources.flatMap((source) => source.waves)),
  ];

  return (
    <Suspense fallback={<div className="px-6 py-10 text-sm text-[#60727D]">Loading readout details…</div>}>
      <ReadoutDetailsShell
        initialReadout={readout}
        clientName={clientName}
        surveyWaves={surveyWaves}
        clientUsers={clientUsers}
        basePath="/portal/readouts"
      />
    </Suspense>
  );
}
