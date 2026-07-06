import { notFound } from "next/navigation";
import { CensusWorkbench } from "@/components/portal/census-workbench";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { listCensusUploads } from "@/lib/firebase/census-store";
import { getAccessibleDashboardAssignments, getAccessiblePortalClients } from "@/lib/firebase/portal-access";

export default async function PortalCensusPage() {
  const user = await requireFirebasePortalUser();
  const canManageCensus = isInternalFirebaseRole(user.role) || user.role === "client_admin";

  if (!canManageCensus) {
    notFound();
  }

  const clients = await getAccessiblePortalClients(user);
  const clientIds = clients.map((client) => client.id);
  const [uploads, assignments] = await Promise.all([
    listCensusUploads(clientIds),
    getAccessibleDashboardAssignments(user),
  ]);

  return (
    <PortalContentFrame>
      <CensusWorkbench
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          shortName: client.shortName,
        }))}
        uploads={uploads}
        dashboards={assignments.map((assignment) => ({
          assetId: assignment.assetId,
          clientId: assignment.clientId,
          title: assignment.title,
        }))}
      />
    </PortalContentFrame>
  );
}
