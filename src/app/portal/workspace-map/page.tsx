import { notFound } from "next/navigation";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { WorkspaceMapView } from "@/components/portal/workspace-map-view";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { buildWorkspaceMapBundle } from "@/lib/firebase/workspace-map";

export default async function PortalWorkspaceMapPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const { maps, idAuditFindings } = await buildWorkspaceMapBundle();
  const { clientId } = await searchParams;
  const initialClientId = clientId ?? maps[0]?.clientId ?? "";

  return (
    <PortalContentFrame>
      <WorkspaceMapView maps={maps} idAuditFindings={idAuditFindings} initialClientId={initialClientId} />
    </PortalContentFrame>
  );
}
