import type { PortalDashboardAssignment } from "@/types/portal";
import { getFirebaseDashboardAssignments } from "./dashboard-store";
import { getFirebaseDataWorkspaces, getFirebasePortalClients } from "./portal-store";
import { isInternalFirebaseRole, type FirebaseAppUser } from "./auth";

export async function getAccessiblePortalClients(user: FirebaseAppUser) {
  const clients = await getFirebasePortalClients();

  if (isInternalFirebaseRole(user.role)) {
    return clients;
  }

  const allowedClientIds = new Set(user.clientIds);
  return clients.filter((client) => allowedClientIds.has(client.id));
}

export async function getAccessibleDashboardAssignments(
  user: FirebaseAppUser
): Promise<PortalDashboardAssignment[]> {
  const assignments = await getFirebaseDashboardAssignments();
  const isDashboardRestricted =
    user.employeeExperienceAccess.dashboardAccessMode === "restricted" ||
    user.employeeExperienceAccess.allowedDashboardAssetIds.length > 0;
  const allowedDashboardAssetIds = new Set(
    user.employeeExperienceAccess.allowedDashboardAssetIds
  );

  if (isInternalFirebaseRole(user.role)) {
    return isDashboardRestricted
      ? assignments.filter((assignment) => allowedDashboardAssetIds.has(assignment.assetId))
      : assignments;
  }

  const allowedClientIds = new Set(user.clientIds);
  const clientAssignments = assignments.filter(
    (assignment) => assignment.published && allowedClientIds.has(assignment.clientId)
  );
  return isDashboardRestricted
    ? clientAssignments.filter((assignment) => allowedDashboardAssetIds.has(assignment.assetId))
    : clientAssignments;
}

export async function getAccessibleDataWorkspaces(user: FirebaseAppUser) {
  const workspaces = await getFirebaseDataWorkspaces();

  if (isInternalFirebaseRole(user.role)) {
    return workspaces;
  }

  const allowedClientIds = new Set(user.clientIds);
  return workspaces.filter((workspace) => allowedClientIds.has(workspace.clientId));
}

export async function getAccessibleClientWorkspace(
  user: FirebaseAppUser,
  clientId: string
) {
  const [clients, workspaces, assignments] = await Promise.all([
    getAccessiblePortalClients(user),
    getAccessibleDataWorkspaces(user),
    getAccessibleDashboardAssignments(user),
  ]);

  const client = clients.find((item) => item.id === clientId) ?? null;
  const workspace = workspaces.find((item) => item.clientId === clientId) ?? null;
  const clientAssignments = assignments.filter((item) => item.clientId === clientId);

  if (!client) {
    return null;
  }

  return {
    client,
    workspace,
    assignments: clientAssignments,
  };
}

export function canManageClientUsers(user: FirebaseAppUser, clientId: string) {
  if (isInternalFirebaseRole(user.role)) {
    return true;
  }

  return user.role === "client_admin" && user.clientIds.includes(clientId);
}

export function canManageClientCensus(user: FirebaseAppUser, clientId: string) {
  if (isInternalFirebaseRole(user.role)) {
    return true;
  }

  return user.role === "client_admin" && user.clientIds.includes(clientId);
}
