import { notFound } from "next/navigation";
import {
  DashboardInstanceAccessForm,
  type AccessMode,
} from "@/components/portal/dashboard-instance-access-form";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getFirebaseDashboardAccessGrantsByInstanceId,
  getFirebaseDashboardInstanceById,
} from "@/lib/firebase/dashboard-store";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";

interface DashboardInstanceAccessPageProps {
  params: Promise<{
    instanceId: string;
  }>;
}

export default async function DashboardInstanceAccessPage({
  params,
}: DashboardInstanceAccessPageProps) {
  const { instanceId } = await params;
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const [instance, clients, grants] = await Promise.all([
    getFirebaseDashboardInstanceById(instanceId),
    getFirebasePortalClients(),
    getFirebaseDashboardAccessGrantsByInstanceId(instanceId),
  ]);

  if (!instance) {
    notFound();
  }

  const grantByClientId = new Map(grants.map((grant) => [grant.clientId, grant]));

  return (
    <DashboardInstanceAccessForm
      instanceId={instanceId}
      title={instance.title}
      rows={clients.map((client) => {
        const grant = grantByClientId.get(client.id);
        const initialMode: AccessMode =
          !grant || grant.status === "hidden"
            ? "none"
            : grant.status === "draft"
              ? "draft"
              : grant.published
                ? "active_published"
                : "active_unpublished";

        return {
          clientId: client.id,
          clientName: client.name,
          clientStatus: client.status,
          grantId: grant?.id,
          initialMode,
        };
      })}
    />
  );
}
