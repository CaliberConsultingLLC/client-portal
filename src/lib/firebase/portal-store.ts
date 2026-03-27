import type { PortalClient } from "@/types/portal";
import type { ClientDataWorkspace } from "@/types/csv-management";
import { PORTAL_CLIENTS } from "@/lib/portal/clients";
import { getClientDataWorkspaces } from "@/lib/portal/data-workspaces";
import { getFirebaseAdminFirestore } from "./admin";
import { seedDefaultDashboardAssignments } from "./dashboard-store";

const CLIENTS_COLLECTION = "clients";
const DATA_SOURCES_COLLECTION = "dataSources";

export interface FirebasePortalClientDoc extends PortalClient {
  status: "active" | "draft";
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseDataWorkspaceDoc extends ClientDataWorkspace {
  createdAt: string;
  updatedAt: string;
}

function nowIso() {
  return new Date().toISOString();
}

function mergeById<T extends { id: string }>(existingDocs: T[], defaultDocs: T[]) {
  const merged = new Map(defaultDocs.map((doc) => [doc.id, doc]));
  existingDocs.forEach((doc) => {
    merged.set(doc.id, doc);
  });
  return Array.from(merged.values());
}

function mergeByClientId<T extends { clientId: string }>(existingDocs: T[], defaultDocs: T[]) {
  const merged = new Map(defaultDocs.map((doc) => [doc.clientId, doc]));
  existingDocs.forEach((doc) => {
    merged.set(doc.clientId, doc);
  });
  return Array.from(merged.values());
}

export function buildDefaultClientDocs(): FirebasePortalClientDoc[] {
  const timestamp = nowIso();

  return PORTAL_CLIENTS.map((client) => ({
    ...client,
    status: client.isDemo ? "draft" : "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function buildDefaultDataWorkspaceDocs(): FirebaseDataWorkspaceDoc[] {
  const timestamp = nowIso();

  return getClientDataWorkspaces().map((workspace) => ({
    ...workspace,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export async function getFirebasePortalClients() {
  try {
    const defaultDocs = buildDefaultClientDocs();
    const snapshot = await getFirebaseAdminFirestore().collection(CLIENTS_COLLECTION).get();

    if (snapshot.empty) {
      return defaultDocs;
    }

    return mergeById(
      snapshot.docs.map((doc) => doc.data() as FirebasePortalClientDoc),
      defaultDocs
    );
  } catch (error) {
    console.error("Failed to read Firebase clients; falling back to defaults.", error);
    return buildDefaultClientDocs();
  }
}

export async function getFirebaseDataWorkspaces() {
  try {
    const defaultDocs = buildDefaultDataWorkspaceDocs();
    const snapshot = await getFirebaseAdminFirestore()
      .collection(DATA_SOURCES_COLLECTION)
      .get();

    if (snapshot.empty) {
      return defaultDocs;
    }

    return mergeByClientId(
      snapshot.docs.map((doc) => doc.data() as FirebaseDataWorkspaceDoc),
      defaultDocs
    );
  } catch (error) {
    console.error("Failed to read Firebase data workspaces; falling back to defaults.", error);
    return buildDefaultDataWorkspaceDocs();
  }
}

export async function seedDefaultPortalCollections() {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();
  const clientDocs = buildDefaultClientDocs();
  const workspaceDocs = buildDefaultDataWorkspaceDocs();

  clientDocs.forEach((client) => {
    batch.set(firestore.collection(CLIENTS_COLLECTION).doc(client.id), client, {
      merge: true,
    });
  });

  workspaceDocs.forEach((workspace) => {
    batch.set(
      firestore.collection(DATA_SOURCES_COLLECTION).doc(workspace.clientId),
      workspace,
      {
        merge: true,
      }
    );
  });

  await batch.commit();
  await seedDefaultDashboardAssignments();
}
