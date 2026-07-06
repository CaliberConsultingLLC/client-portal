import type { DashboardGuidancePin, DashboardGuidanceScope } from "@/types/guidance-pins";
import { getFirebaseAdminFirestore } from "./admin";

const COLLECTION = "dashboardGuidanceScopes";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildGuidanceScopeId(
  dashboardInstanceId: string,
  perspectiveId: string,
  campaignLabel: string,
  filterKey: string
) {
  return [
    slugify(dashboardInstanceId),
    slugify(perspectiveId),
    slugify(campaignLabel),
    slugify(filterKey || "default"),
  ].join("__");
}

export async function getDashboardGuidanceScope(
  dashboardInstanceId: string,
  perspectiveId: string,
  campaignLabel: string,
  filterKey: string
): Promise<DashboardGuidanceScope | null> {
  const id = buildGuidanceScopeId(dashboardInstanceId, perspectiveId, campaignLabel, filterKey);
  const snapshot = await getFirebaseAdminFirestore().collection(COLLECTION).doc(id).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Omit<DashboardGuidanceScope, "id">;
  return {
    id,
    ...data,
    pins: Array.isArray(data.pins) ? data.pins : [],
  };
}

export async function saveDashboardGuidanceScope(input: {
  dashboardInstanceId: string;
  perspectiveId: string;
  campaignLabel: string;
  filterKey: string;
  pins: DashboardGuidancePin[];
  updatedBy?: string | null;
}): Promise<DashboardGuidanceScope> {
  const id = buildGuidanceScopeId(
    input.dashboardInstanceId,
    input.perspectiveId,
    input.campaignLabel,
    input.filterKey
  );
  const timestamp = new Date().toISOString();
  const normalizedPins = input.pins
    .map((pin, index) => ({
      id: pin.id,
      title: pin.title.trim(),
      body: pin.body.trim(),
      accent: pin.accent,
      order: index,
    }))
    .filter((pin) => pin.title.length > 0);

  const payload = {
    dashboardInstanceId: input.dashboardInstanceId,
    perspectiveId: input.perspectiveId,
    campaignLabel: input.campaignLabel,
    filterKey: input.filterKey,
    pins: normalizedPins,
    updatedAt: timestamp,
    updatedBy: input.updatedBy ?? null,
  };

  await getFirebaseAdminFirestore().collection(COLLECTION).doc(id).set(payload, { merge: true });

  return { id, ...payload };
}
