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

export async function getAccessibleDashboardAssignments(user: FirebaseAppUser) {
  const assignments = await getFirebaseDashboardAssignments();

  if (isInternalFirebaseRole(user.role)) {
    return assignments;
  }

  const allowedClientIds = new Set(user.clientIds);
  return assignments.filter(
    (assignment) => assignment.published && allowedClientIds.has(assignment.clientId)
  );
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
