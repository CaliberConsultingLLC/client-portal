import type { PortalDashboardAssignment } from "@/types/portal";
import { getFirebaseAdminFirestore } from "./admin";

const DASHBOARD_ASSIGNMENTS_COLLECTION = "dashboardAssignments";

function nowIso() {
  return new Date().toISOString();
}

function mergeDashboardAssignments(
  existingAssignments: PortalDashboardAssignment[],
  defaultAssignments: PortalDashboardAssignment[]
) {
  const merged = new Map(defaultAssignments.map((assignment) => [assignment.id, assignment]));

  existingAssignments.forEach((assignment) => {
    merged.set(assignment.id, assignment);
  });

  return Array.from(merged.values());
}

export function buildDefaultDashboardAssignments(): PortalDashboardAssignment[] {
  const timestamp = nowIso();

  return [
    {
      id: "demo-collaboration-dashboard",
      clientId: "demo",
      assetId: "collaboration-dashboard",
      title: "Collaboration Dashboard",
      description:
        "Interactive collaboration reporting designed to surface relationship friction, trust patterns, and action priorities.",
      href: "/portal/dashboards/collaboration-dashboard",
      previewHref: "/collaboration/demo",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "demo-integration-dashboard",
      clientId: "demo",
      assetId: "integration-dashboard",
      title: "Integration Dashboard",
      description:
        "Integration effectiveness reporting with statement breakdowns, segment views, and employee voice analysis.",
      href: "/portal/dashboards/integration-dashboard",
      previewHref: "/integration-effectiveness/demo",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "csg-integration-dashboard",
      clientId: "csg",
      assetId: "integration-dashboard",
      title: "Canopy Integration Dashboard",
      description:
        "Client-specific integration reporting for Canopy Services Group, backed by the active CSV workspace.",
      href: "/portal/dashboards/integration-dashboard",
      previewHref: "/integration-effectiveness/demo",
      status: "active",
      published: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "dws-employee-experience-dashboard",
      clientId: "dws",
      assetId: "dws-employee-experience",
      title: "DWS Employee Experience Dashboard",
      description:
        "Employee experience reporting rebuilt for Deep Well Services with historical trends, department cuts, field views, supervisor analysis, and comment themes.",
      href: "/portal/dashboards/dws-employee-experience",
      previewHref: "/employee-experience/dws",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export async function getFirebaseDashboardAssignments() {
  try {
    const defaultAssignments = buildDefaultDashboardAssignments();
    const snapshot = await getFirebaseAdminFirestore()
      .collection(DASHBOARD_ASSIGNMENTS_COLLECTION)
      .get();

    if (snapshot.empty) {
      return defaultAssignments;
    }

    return mergeDashboardAssignments(
      snapshot.docs.map((doc) => doc.data() as PortalDashboardAssignment),
      defaultAssignments
    );
  } catch (error) {
    console.error("Failed to read Firebase dashboard assignments; falling back to defaults.", error);
    return buildDefaultDashboardAssignments();
  }
}

export async function seedDefaultDashboardAssignments() {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  buildDefaultDashboardAssignments().forEach((assignment) => {
    batch.set(
      firestore.collection(DASHBOARD_ASSIGNMENTS_COLLECTION).doc(assignment.id),
      assignment,
      { merge: true }
    );
  });

  await batch.commit();
}
