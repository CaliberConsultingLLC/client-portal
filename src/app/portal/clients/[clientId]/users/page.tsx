import { notFound } from "next/navigation";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";
import { canManageClientUsers, getAccessibleClientWorkspace } from "@/lib/firebase/portal-access";
import { listFirebaseUsersByClientId } from "@/lib/firebase/user-store";
import { ClientUserManagement } from "@/components/portal/client-user-management";

interface ClientUsersPageProps {
  params: Promise<{
    clientId: string;
  }>;
}

export default async function ClientUsersPage({ params }: ClientUsersPageProps) {
  const { clientId } = await params;
  const user = await requireFirebasePortalUser();
  const workspaceAccess = await getAccessibleClientWorkspace(user, clientId);

  if (!workspaceAccess || !canManageClientUsers(user, clientId)) {
    notFound();
  }

  const users = await listFirebaseUsersByClientId(clientId);

  return (
    <ClientUserManagement
      clientId={clientId}
      clientName={workspaceAccess.client.name}
      initialUsers={users}
    />
  );
}
