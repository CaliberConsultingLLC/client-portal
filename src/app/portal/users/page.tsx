import { notFound } from "next/navigation";
import { AdminUserManagement } from "@/components/admin/admin-user-management";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { listAllFirebaseUsers } from "@/lib/firebase/user-store";

export default async function PortalUsersPage() {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const [users, clients] = await Promise.all([
    listAllFirebaseUsers(),
    getFirebasePortalClients(),
  ]);

  return (
    <AdminUserManagement
      initialUsers={users}
      clients={clients}
      eyebrow="Caliber Consulting LLC"
      title="Users"
      description="Manage portal users, their access level, and their assigned client workspaces without leaving the current portal experience."
      savePath="/api/portal/users"
    />
  );
}
