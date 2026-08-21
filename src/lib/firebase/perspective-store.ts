import type {
  DashboardPerspectiveInstance,
  PerspectiveLibraryItem,
  PortalDashboardFamily,
} from "@/types/portal";
import { getFirebaseAdminFirestore } from "./admin";

const PERSPECTIVE_LIBRARY_COLLECTION = "perspectiveLibrary";
const DASHBOARD_PERSPECTIVE_INSTANCES_COLLECTION = "dashboardPerspectiveInstances";

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeVersionLabel(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "v.1.0";
  }

  if (/^v\.\d+(\.\d+)*$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const stripped = trimmed.replace(/^v\.?/i, "").trim();
  return `v.${stripped}`;
}

function normalizeCategoryLabels(labels?: string[] | null) {
  const normalized = (labels ?? [])
    .map((label) => label.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function buildCategoryIds(labels?: string[] | null) {
  return normalizeCategoryLabels(labels).map((label) => slugify(label));
}

function mergeById<T extends { id: string }>(existingDocs: T[], defaultDocs: T[]) {
  const merged = new Map(defaultDocs.map((doc) => [doc.id, doc]));
  existingDocs.forEach((doc) => {
    merged.set(doc.id, doc);
  });
  return Array.from(merged.values());
}

function buildLibraryItem(
  dashboardId: string,
  family: PortalDashboardFamily,
  id: string,
  title: string,
  description: string,
  rendererKey: string,
  options?: {
    versionLabel?: string | null;
    defaultCategoryIds?: string[];
    defaultCategoryLabels?: string[];
    notes?: string | null;
  }
): PerspectiveLibraryItem {
  const timestamp = nowIso();
  return {
    id,
    dashboardId,
    family,
    title,
    versionLabel: options?.versionLabel ?? "v.1.0",
    description,
    rendererKey,
    defaultCategoryIds: options?.defaultCategoryIds,
    defaultCategoryLabels: options?.defaultCategoryLabels,
    notes: options?.notes ?? null,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildDefaultPerspectiveLibraryItems(): PerspectiveLibraryItem[] {
  return [
    buildLibraryItem(
      "collaboration-v1",
      "collaboration",
      "collaboration-overview",
      "Overview",
      "Top-level collaboration summary and KPI view.",
      "collaboration.overview"
    ),
    buildLibraryItem(
      "collaboration-v1",
      "collaboration",
      "collaboration-cdrs-heatmap",
      "CDRS Heatmap",
      "Heatmap view of cross-department relationship strength.",
      "collaboration.cdrsHeatmap"
    ),
    buildLibraryItem(
      "collaboration-v1",
      "collaboration",
      "collaboration-cdrs",
      "CDRS",
      "Cross-department relationship score breakdown.",
      "collaboration.cdrs"
    ),
    buildLibraryItem(
      "collaboration-v1",
      "collaboration",
      "collaboration-ci",
      "CI",
      "Collaboration Index detail view.",
      "collaboration.ci"
    ),
    buildLibraryItem(
      "collaboration-v1",
      "collaboration",
      "collaboration-department-report",
      "Department Report",
      "Department-level collaboration reporting and action detail.",
      "collaboration.departmentReport"
    ),
    buildLibraryItem(
      "integration-effectiveness-v1",
      "integration",
      "integration-overview",
      "Overview",
      "Leadership summary and current-state integration readout.",
      "integration.overview",
      {
        defaultCategoryIds: ["canopy"],
        defaultCategoryLabels: ["Canopy"],
      }
    ),
    buildLibraryItem(
      "integration-effectiveness-v1",
      "integration",
      "integration-longitudinal-trends",
      "Longitudinal Trends",
      "Current-state structure for multi-wave campaign trend reporting.",
      "integration.longitudinalTrends",
      {
        defaultCategoryIds: ["canopy"],
        defaultCategoryLabels: ["Canopy"],
      }
    ),
    buildLibraryItem(
      "integration-effectiveness-v1",
      "integration",
      "integration-statement-trends",
      "Statement Trends",
      "Statement-level cuts across brand, campaign, role, and department.",
      "integration.statementTrends",
      {
        defaultCategoryIds: ["canopy"],
        defaultCategoryLabels: ["Canopy"],
      }
    ),
    buildLibraryItem(
      "integration-effectiveness-v1",
      "integration",
      "integration-protect-prioritize",
      "Protect & Prioritize",
      "Strength and opportunity signal view for leadership action.",
      "integration.protectPrioritize",
      {
        defaultCategoryIds: ["canopy"],
        defaultCategoryLabels: ["Canopy"],
      }
    ),
    buildLibraryItem(
      "integration-effectiveness-v1",
      "integration",
      "integration-brand-report",
      "Brand Report",
      "Brand-specific perspective with filtered statement and heatmap detail.",
      "integration.brandReport",
      {
        defaultCategoryIds: ["brand"],
        defaultCategoryLabels: ["Brand"],
      }
    ),
    buildLibraryItem(
      "integration-effectiveness-v1",
      "integration",
      "integration-employee-voice",
      "Employee Voice",
      "Comment sentiment and theme analysis with active filters.",
      "integration.employeeVoice",
      {
        defaultCategoryIds: ["canopy", "brand"],
        defaultCategoryLabels: ["Canopy", "Brand"],
      }
    ),
    buildLibraryItem(
      "employee-experience-v1",
      "employee_experience",
      "employee-experience-investigation-hub",
      "Investigation Hub",
      "Review mode for employee experience exploration and filtering.",
      "employeeExperience.investigationHub",
      {
        defaultCategoryIds: ["review"],
        defaultCategoryLabels: ["Review"],
      }
    ),
    buildLibraryItem(
      "employee-experience-v1",
      "employee_experience",
      "employee-experience-department-report",
      "Department Report",
      "Department-level employee experience reporting.",
      "employeeExperience.departmentReport",
      {
        defaultCategoryIds: ["reports"],
        defaultCategoryLabels: ["Reports"],
      }
    ),
    buildLibraryItem(
      "employee-experience-v1",
      "employee_experience",
      "employee-experience-supervisor-report",
      "Supervisor Report",
      "Supervisor-level employee experience reporting.",
      "employeeExperience.supervisorReport",
      {
        defaultCategoryIds: ["reports"],
        defaultCategoryLabels: ["Reports"],
      }
    ),
  ];
}

function buildDashboardPerspectiveInstance(
  dashboardInstanceId: string,
  libraryItem: PerspectiveLibraryItem,
  order: number,
  overrides?: {
    title?: string;
    description?: string;
    categoryIds?: string[];
    categoryLabels?: string[];
  }
): DashboardPerspectiveInstance {
  const timestamp = nowIso();
  const suffix = libraryItem.id.replace(/^[^-]+-/, "");
  return {
    id: `${dashboardInstanceId}-${suffix}`,
    dashboardInstanceId,
    libraryItemId: libraryItem.id,
    title: overrides?.title ?? libraryItem.title,
    description: overrides?.description ?? libraryItem.description,
    rendererKey: libraryItem.rendererKey,
    order,
    categoryIds: overrides?.categoryIds ?? libraryItem.defaultCategoryIds,
    categoryLabels: overrides?.categoryLabels ?? libraryItem.defaultCategoryLabels,
    isCustomized: false,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildDefaultDashboardPerspectiveInstances(): DashboardPerspectiveInstance[] {
  const library = new Map(buildDefaultPerspectiveLibraryItems().map((item) => [item.id, item]));
  const byId = (id: string) => {
    const item = library.get(id);
    if (!item) {
      throw new Error(`Missing default perspective library item: ${id}`);
    }
    return item;
  };

  return [
    buildDashboardPerspectiveInstance("collaboration-demo-instance", byId("collaboration-overview"), 1),
    buildDashboardPerspectiveInstance("collaboration-demo-instance", byId("collaboration-cdrs-heatmap"), 2),
    buildDashboardPerspectiveInstance("collaboration-demo-instance", byId("collaboration-cdrs"), 3),
    buildDashboardPerspectiveInstance("collaboration-demo-instance", byId("collaboration-ci"), 4),
    buildDashboardPerspectiveInstance("collaboration-demo-instance", byId("collaboration-department-report"), 5),

    buildDashboardPerspectiveInstance("integration-demo-instance", byId("integration-overview"), 1),
    buildDashboardPerspectiveInstance("integration-demo-instance", byId("integration-longitudinal-trends"), 2),
    buildDashboardPerspectiveInstance("integration-demo-instance", byId("integration-statement-trends"), 3),
    buildDashboardPerspectiveInstance("integration-demo-instance", byId("integration-protect-prioritize"), 4),
    buildDashboardPerspectiveInstance("integration-demo-instance", byId("integration-brand-report"), 5),
    buildDashboardPerspectiveInstance("integration-demo-instance", byId("integration-employee-voice"), 6),

    buildDashboardPerspectiveInstance("csg-integration-instance", byId("integration-overview"), 1),
    buildDashboardPerspectiveInstance("csg-integration-instance", byId("integration-longitudinal-trends"), 2),
    buildDashboardPerspectiveInstance("csg-integration-instance", byId("integration-statement-trends"), 3),
    buildDashboardPerspectiveInstance("csg-integration-instance", byId("integration-protect-prioritize"), 4),
    buildDashboardPerspectiveInstance("csg-integration-instance", byId("integration-brand-report"), 5),
    buildDashboardPerspectiveInstance("csg-integration-instance", byId("integration-employee-voice"), 6),

    buildDashboardPerspectiveInstance(
      "dws-employee-experience-instance",
      byId("employee-experience-investigation-hub"),
      1
    ),
    buildDashboardPerspectiveInstance(
      "dws-employee-experience-instance",
      byId("employee-experience-department-report"),
      2
    ),
    buildDashboardPerspectiveInstance(
      "dws-employee-experience-instance",
      byId("employee-experience-supervisor-report"),
      3
    ),
  ];
}

export async function getPerspectiveLibraryItems() {
  try {
    const defaults = buildDefaultPerspectiveLibraryItems();
    const snapshot = await getFirebaseAdminFirestore().collection(PERSPECTIVE_LIBRARY_COLLECTION).get();

    if (snapshot.empty) {
      return defaults;
    }

    return mergeById(snapshot.docs.map((doc) => doc.data() as PerspectiveLibraryItem), defaults);
  } catch (error) {
    console.error("Failed to read perspective library; falling back to defaults.", error);
    return buildDefaultPerspectiveLibraryItems();
  }
}

export async function getDashboardPerspectiveInstances() {
  try {
    const defaults = buildDefaultDashboardPerspectiveInstances();
    const snapshot = await getFirebaseAdminFirestore()
      .collection(DASHBOARD_PERSPECTIVE_INSTANCES_COLLECTION)
      .get();

    if (snapshot.empty) {
      return defaults;
    }

    return mergeById(snapshot.docs.map((doc) => doc.data() as DashboardPerspectiveInstance), defaults);
  } catch (error) {
    console.error("Failed to read dashboard perspective instances; falling back to defaults.", error);
    return buildDefaultDashboardPerspectiveInstances();
  }
}

export async function getDashboardPerspectiveInstancesByDashboardId(dashboardInstanceId: string) {
  const instances = await getDashboardPerspectiveInstances();
  return instances
    .filter((instance) => instance.dashboardInstanceId === dashboardInstanceId)
    .sort((left, right) => left.order - right.order);
}

export async function getPerspectiveLibraryMap() {
  const items = await getPerspectiveLibraryItems();
  return new Map(items.map((item) => [item.id, item]));
}

export async function getPerspectiveLibraryItemById(perspectiveId: string) {
  const items = await getPerspectiveLibraryItems();
  return items.find((item) => item.id === perspectiveId) ?? null;
}

export async function getPerspectiveLibraryItemsByDashboardId(dashboardId: string) {
  const items = await getPerspectiveLibraryItems();
  return items.filter((item) => item.dashboardId === dashboardId);
}

interface CreatePerspectiveLibraryItemInput {
  dashboardId: string;
  family: PortalDashboardFamily;
  title: string;
  versionLabel?: string | null;
  description: string;
  rendererKey: string;
  defaultCategoryLabels?: string[];
  notes?: string | null;
}

interface UpdatePerspectiveLibraryItemInput {
  perspectiveId: string;
  dashboardId?: string;
  family?: PortalDashboardFamily;
  title?: string;
  versionLabel?: string | null;
  description?: string;
  rendererKey?: string;
  defaultCategoryLabels?: string[];
  notes?: string | null;
  status?: PerspectiveLibraryItem["status"];
}

export async function createPerspectiveLibraryItem(input: CreatePerspectiveLibraryItemInput) {
  const items = await getPerspectiveLibraryItems();
  const versionLabel = normalizeVersionLabel(input.versionLabel);
  const perspectiveId = `${slugify(input.title)}-${slugify(versionLabel)}`;

  if (items.some((item) => item.id === perspectiveId)) {
    throw new Error("A perspective product with this title and version already exists.");
  }

  const timestamp = nowIso();
  const defaultCategoryLabels = normalizeCategoryLabels(input.defaultCategoryLabels);
  const item: PerspectiveLibraryItem = {
    id: perspectiveId,
    dashboardId: input.dashboardId,
    family: input.family,
    title: input.title.trim(),
    versionLabel,
    description: input.description.trim(),
    rendererKey: input.rendererKey.trim(),
    defaultCategoryLabels,
    defaultCategoryIds: buildCategoryIds(defaultCategoryLabels),
    notes: input.notes?.trim() || null,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(PERSPECTIVE_LIBRARY_COLLECTION)
    .doc(item.id)
    .set(item, { merge: true });

  return item;
}

export async function updatePerspectiveLibraryItem(input: UpdatePerspectiveLibraryItemInput) {
  const existingItem = await getPerspectiveLibraryItemById(input.perspectiveId);

  if (!existingItem) {
    throw new Error("Perspective product not found.");
  }

  const nextCategoryLabels =
    input.defaultCategoryLabels !== undefined
      ? normalizeCategoryLabels(input.defaultCategoryLabels)
      : existingItem.defaultCategoryLabels;

  const updatedItem: PerspectiveLibraryItem = {
    ...existingItem,
    dashboardId: input.dashboardId ?? existingItem.dashboardId,
    family: input.family ?? existingItem.family,
    title: input.title?.trim() || existingItem.title,
    versionLabel:
      input.versionLabel !== undefined
        ? normalizeVersionLabel(input.versionLabel)
        : existingItem.versionLabel,
    description: input.description?.trim() || existingItem.description,
    rendererKey: input.rendererKey?.trim() || existingItem.rendererKey,
    defaultCategoryLabels: nextCategoryLabels,
    defaultCategoryIds:
      input.defaultCategoryLabels !== undefined
        ? buildCategoryIds(nextCategoryLabels)
        : existingItem.defaultCategoryIds,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existingItem.notes,
    status: input.status ?? existingItem.status,
    updatedAt: nowIso(),
  };

  await getFirebaseAdminFirestore()
    .collection(PERSPECTIVE_LIBRARY_COLLECTION)
    .doc(existingItem.id)
    .set(updatedItem, { merge: true });

  return updatedItem;
}

export async function createPerspectiveInstancesForDashboardInstance(
  dashboardId: string,
  dashboardInstanceId: string
) {
  const firestore = getFirebaseAdminFirestore();
  const libraryItems = (await getPerspectiveLibraryItems()).filter(
    (item) => item.dashboardId === dashboardId && item.status === "active"
  );

  if (libraryItems.length === 0) {
    return [];
  }

  const batch = firestore.batch();
  const createdInstances: DashboardPerspectiveInstance[] = [];
  const timestamp = nowIso();

  libraryItems.forEach((item, index) => {
    const suffix = item.id.replace(/^[^-]+-/, "");
    const instance: DashboardPerspectiveInstance = {
      id: `${dashboardInstanceId}-${suffix}`,
      dashboardInstanceId,
      libraryItemId: item.id,
      title: item.title,
      description: item.description,
      rendererKey: item.rendererKey,
      order: index + 1,
      categoryIds: item.defaultCategoryIds,
      categoryLabels: item.defaultCategoryLabels,
      isCustomized: false,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    createdInstances.push(instance);
    batch.set(
      firestore.collection(DASHBOARD_PERSPECTIVE_INSTANCES_COLLECTION).doc(instance.id),
      instance,
      { merge: true }
    );
  });

  await batch.commit();
  return createdInstances;
}

export async function addPerspectiveInstanceToDashboardInstance(
  perspectiveId: string,
  dashboardInstanceId: string
) {
  const [libraryItem, instances] = await Promise.all([
    getPerspectiveLibraryItemById(perspectiveId),
    getDashboardPerspectiveInstancesByDashboardId(dashboardInstanceId),
  ]);

  if (!libraryItem) {
    throw new Error("Perspective product not found.");
  }

  const existing = instances.find((instance) => instance.libraryItemId === perspectiveId);

  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const suffix = libraryItem.id.replace(/^[^-]+-/, "");
  const instance: DashboardPerspectiveInstance = {
    id: `${dashboardInstanceId}-${suffix}`,
    dashboardInstanceId,
    libraryItemId: libraryItem.id,
    title: libraryItem.title,
    description: libraryItem.description,
    rendererKey: libraryItem.rendererKey,
    order: (instances.at(-1)?.order ?? 0) + 1,
    categoryIds: libraryItem.defaultCategoryIds,
    categoryLabels: libraryItem.defaultCategoryLabels,
    isCustomized: false,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(DASHBOARD_PERSPECTIVE_INSTANCES_COLLECTION)
    .doc(instance.id)
    .set(instance, { merge: true });

  return instance;
}

export async function seedDefaultPerspectiveCollections() {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  buildDefaultPerspectiveLibraryItems().forEach((item) => {
    batch.set(firestore.collection(PERSPECTIVE_LIBRARY_COLLECTION).doc(item.id), item, {
      merge: true,
    });
  });

  buildDefaultDashboardPerspectiveInstances().forEach((instance) => {
    batch.set(
      firestore.collection(DASHBOARD_PERSPECTIVE_INSTANCES_COLLECTION).doc(instance.id),
      instance,
      { merge: true }
    );
  });

  await batch.commit();
}
