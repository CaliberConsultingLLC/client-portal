import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  getActualRole,
  isInternalFirebaseRole,
  requireFirebasePortalUser,
} from "@/lib/firebase/auth";
import { getAccessibleDashboardAssignments, getAccessiblePortalClients } from "@/lib/firebase/portal-access";
import { listAllFirebaseUsers } from "@/lib/firebase/user-store";

export const metadata: Metadata = {
  title: "Caliber Consulting LLC Portal",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireFirebasePortalUser();
  const [clients, assignments] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessibleDashboardAssignments(user),
  ]);
  const demoClientIds = new Set(clients.filter((client) => client.isDemo).map((client) => client.id));
  const demoAssignments = assignments.filter((assignment) => demoClientIds.has(assignment.clientId));
  const defaultDemoLabHref = "/portal/dashboards/lab/collaboration?demoLab=open";

  // Any internal admin (super or internal) can preview the portal as another user.
  const canPreviewAsUser = isInternalFirebaseRole(getActualRole(user));
  // Average client viewers (executive/management/employee) get a stripped-down
  // "Home only" experience. Internal staff and client admins keep full nav.
  const restrictToHomeNav =
    !isInternalFirebaseRole(user.role) && user.role !== "client_admin";
  const viewAsUsers = canPreviewAsUser
    ? (await listAllFirebaseUsers())
        .filter((entry) => entry.isActive)
        .map((entry) => ({
          uid: entry.uid,
          name: entry.fullName || entry.email,
          email: entry.email,
          role: entry.role,
        }))
    : [];

  return (
    <PortalShell
      userName={user.fullName ?? user.email}
      isInternalUser={isInternalFirebaseRole(user.role)}
      showViewAsToggle={canPreviewAsUser}
      isViewingAsUser={Boolean(user.viewingAsUserUid)}
      viewingAsUserUid={user.viewingAsUserUid}
      viewAsUsers={viewAsUsers}
      demoDashboardAssetIds={demoAssignments.map((assignment) => assignment.assetId)}
      hasDemoWorkspaceAccess={demoClientIds.size > 0}
      defaultDemoLabHref={defaultDemoLabHref}
      restrictToHomeNav={restrictToHomeNav}
    >
      {children}
    </PortalShell>
  );
}
