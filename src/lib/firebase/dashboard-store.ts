import type {
  PortalDashboard,
  PortalDashboardAccessGrant,
  PortalDashboardAssignment,
  PortalDashboardInstance,
} from "@/types/portal";
import {
  buildEmptyDashboardFieldMappings,
  getDashboardDataMappingPreset,
  validateDashboardFieldMappings,
} from "@/lib/portal/data-mapping";
import { getFirebaseAdminFirestore } from "./admin";
import {
  createPerspectiveInstancesForDashboardInstance,
  getDashboardPerspectiveInstances,
} from "./perspective-store";

const DASHBOARDS_COLLECTION = "dashboards";
const DASHBOARD_INSTANCES_COLLECTION = "dashboardInstances";
const DASHBOARD_ACCESS_GRANTS_COLLECTION = "dashboardAccessGrants";

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

function buildDefaultDataMapping(family: PortalDashboard["family"]) {
  const preset = getDashboardDataMappingPreset(family);
  const validation = validateDashboardFieldMappings(family, buildEmptyDashboardFieldMappings(family));

  return {
    schemaId: preset.schemaId,
    status: "draft" as const,
    fieldMappings: buildEmptyDashboardFieldMappings(family),
    notes: null,
    validation: {
      ...validation,
      lastValidatedAt: null,
    },
  };
}

function mergeDashboards(existingDashboards: PortalDashboard[], defaultDashboards: PortalDashboard[]) {
  const merged = new Map(defaultDashboards.map((dashboard) => [dashboard.id, dashboard]));
  existingDashboards.forEach((dashboard) => {
    merged.set(dashboard.id, dashboard);
  });
  return Array.from(merged.values());
}

function mergeDashboardInstances(
  existingInstances: PortalDashboardInstance[],
  defaultInstances: PortalDashboardInstance[]
) {
  const defaultsById = new Map(defaultInstances.map((instance) => [instance.id, instance]));
  const merged = new Map<string, PortalDashboardInstance>();

  // Seed defaults only for instances that do not exist in Firestore yet.
  defaultInstances.forEach((instance) => {
    merged.set(instance.id, instance);
  });

  existingInstances.forEach((instance) => {
    const defaultInstance = defaultsById.get(instance.id);
    // Firestore is the source of truth for every deployed instance (including client production).
    merged.set(instance.id, {
      ...(defaultInstance ?? {}),
      ...instance,
      dashboardId: instance.dashboardId ?? defaultInstance?.dashboardId ?? instance.id,
      dataMapping: instance.dataMapping ?? defaultInstance?.dataMapping,
    });
  });

  return Array.from(merged.values());
}

function mergeDashboardAccessGrants(
  existingGrants: PortalDashboardAccessGrant[],
  defaultGrants: PortalDashboardAccessGrant[]
) {
  const merged = new Map(defaultGrants.map((grant) => [grant.id, grant]));

  existingGrants.forEach((grant) => {
    merged.set(grant.id, grant);
  });

  return Array.from(merged.values());
}

export function buildDefaultDashboards(): PortalDashboard[] {
  const timestamp = nowIso();

  return [
    {
      id: "collaboration-v1",
      assetId: "collaboration-dashboard",
      family: "collaboration",
      title: "Collaboration",
      versionLabel: "v.1.0",
      categoryIds: ["collaboration"],
      categoryLabels: ["Collaboration"],
      description:
        "Core collaboration product focused on relationship friction, trust patterns, and action priorities.",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "integration-effectiveness-v1",
      assetId: "integration-dashboard",
      family: "integration",
      title: "Integration Effectiveness",
      versionLabel: "v.1.0",
      categoryIds: ["integration"],
      categoryLabels: ["Integration"],
      description:
        "Core integration product designed for statement trends, campaign cuts, brand reporting, and employee voice.",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "employee-experience-v1",
      assetId: "dws-employee-experience",
      family: "employee_experience",
      title: "Employee Experience",
      versionLabel: "v.1.0",
      categoryIds: ["employee-experience"],
      categoryLabels: ["Employee Experience"],
      description:
        "Core employee experience product for investigative review, department reporting, and supervisor insights.",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export function buildDefaultDashboardInstances(): PortalDashboardInstance[] {
  const timestamp = nowIso();

  return [
    {
      id: "collaboration-demo-instance",
      dashboardId: "collaboration-v1",
      assetId: "collaboration-dashboard",
      family: "collaboration",
      title: "Collaboration",
      description:
        "Interactive collaboration reporting designed to surface relationship friction, trust patterns, and action priorities.",
      previewHref: "/collaboration/demo",
      internalNotes: null,
      dataSource: {
        kind: "synthetic_demo",
        label: "Synthetic collaboration demo dataset",
        sourceClientId: "demo",
        notes: "Scenario-driven synthetic respondent data for internal previews and iteration.",
      },
      dataMapping: buildDefaultDataMapping("collaboration"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: [],
      },
      perspectiveCount: 13,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "collaboration-tsi-demo-instance",
      dashboardId: "collaboration-v1",
      assetId: "collaboration-dashboard--tsi",
      family: "collaboration",
      title: "Tech Systems Collaboration Demo",
      description:
        "Dedicated collaboration demo environment for Tech Systems, Inc. using the collaboration demo product experience.",
      previewHref: "/portal/dashboards/collaboration-dashboard--tsi?demoLab=open",
      internalNotes: null,
      dataSource: {
        kind: "synthetic_demo",
        label: "Tech Systems collaboration demo dataset",
        sourceClientId: "tsi",
        notes: "Client-specific copy of the collaboration demo environment for Tech Systems, Inc.",
      },
      dataMapping: buildDefaultDataMapping("collaboration"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: [],
      },
      perspectiveCount: 13,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "integration-demo-instance",
      dashboardId: "integration-effectiveness-v1",
      assetId: "integration-dashboard",
      family: "integration",
      title: "Integration Effectiveness",
      description:
        "Integration effectiveness reporting with statement breakdowns, segment views, and employee voice analysis.",
      previewHref: "/integration-effectiveness/demo",
      internalNotes: null,
      dataSource: {
        kind: "firebase_csv_workspace",
        label: "Integration demo CSV workspace",
        sourceClientId: "demo",
        notes: "CSV-backed integration data loaded through the portal demo pipeline.",
      },
      dataMapping: buildDefaultDataMapping("integration"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: [],
      },
      perspectiveCount: 6,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "csg-integration-instance",
      dashboardId: "integration-effectiveness-v1",
      assetId: "csg-integration-dashboard",
      family: "integration",
      title: "Integration Effectiveness",
      description:
        "A client-ready view of integration results across survey statements, campaign lenses, brand cuts, and employee feedback to help leaders spot strengths, risks, and priority actions.",
      previewHref: "/integration-effectiveness/csg",
      internalNotes: null,
      dataSource: {
        kind: "firebase_csv_workspace",
        label: "Canopy Services Group CSV workspace",
        sourceClientId: "csg",
        notes: "Client-owned integration workspace for Canopy Services Group.",
      },
      dataMapping: buildDefaultDataMapping("integration"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: [],
      },
      perspectiveCount: 6,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "employee-experience-v1-dws-instance",
      dashboardId: "employee-experience-v1",
      assetId: "employee-experience--dws",
      family: "employee_experience",
      title: "Employee Experience",
      description:
        "Employee experience reporting for Deep Well Services with historical trends, department breakdowns, supervisor analysis, and comment themes.",
      previewHref: "/portal/dashboards/employee-experience--dws",
      internalNotes: null,
      dataSource: {
        kind: "firebase_csv_workspace",
        label: "Deep Well Services employee experience workspace",
        sourceClientId: "dws",
        notes: "Reads from clients/dws/data in Firebase Storage.",
      },
      dataMapping: buildDefaultDataMapping("employee_experience"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: ["acquisition", "enps"],
      },
      perspectiveCount: 3,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "employee-experience-v1-dws-field-instance",
      dashboardId: "employee-experience-v1",
      assetId: "employee-experience--dws-field",
      family: "employee_experience",
      title: "Field Employee Experience",
      description:
        "Employee experience reporting for Deep Well Services field employees with campaign trends, department breakdowns, and supervisor insights.",
      previewHref: "/portal/dashboards/employee-experience--dws-field",
      internalNotes: null,
      dataSource: {
        kind: "firebase_csv_workspace",
        label: "Deep Well Services field employee experience workspace",
        sourceClientId: "dws-field",
        notes: "Reads field database.csv and EE field statements.csv from clients/dws/data in Firebase Storage.",
      },
      dataMapping: buildDefaultDataMapping("employee_experience"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: ["acquisition", "enps"],
      },
      perspectiveCount: 3,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "tf-collaboration-instance",
      dashboardId: "collaboration-v1",
      assetId: "tf-collaboration",
      family: "collaboration",
      title: "Top Flight Collaboration",
      description:
        "Collaboration reporting for Top Flight, Inc. built from the client's collaboration database and statement map in Firebase storage.",
      previewHref: "/portal/dashboards/tf-collaboration",
      internalNotes: null,
      dataSource: {
        kind: "firebase_csv_workspace",
        label: "Top Flight collaboration CSV workspace",
        sourceClientId: "tf",
        notes: "TF Collab Database and TF Collaboration Statements CSVs from clients/tf/data.",
      },
      dataMapping: buildDefaultDataMapping("collaboration"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: [],
      },
      perspectiveCount: 0,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "tsi-collaboration-instance",
      dashboardId: "collaboration-v1",
      assetId: "tsi-collaboration",
      family: "collaboration",
      title: "Tech Systems Collaboration",
      description:
        "Collaboration reporting for Tech Systems, Inc. using a preview dataset across TSI departments.",
      previewHref: "/portal/dashboards/tsi-collaboration",
      internalNotes: null,
      dataSource: {
        kind: "synthetic_demo",
        label: "Tech Systems collaboration preview dataset",
        sourceClientId: "tsi",
        notes: "Synthetic department-level collaboration data for the TSI workspace preview.",
      },
      dataMapping: buildDefaultDataMapping("collaboration"),
      settings: {
        status: "active",
        visibilityThreshold: null,
        hiddenDimensionIds: [],
      },
      perspectiveCount: 0,
      reportCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export function buildDefaultDashboardAccessGrants(): PortalDashboardAccessGrant[] {
  const timestamp = nowIso();

  return [
    {
      id: "demo-collaboration-access",
      clientId: "demo",
      dashboardInstanceId: "collaboration-demo-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "tsi-collaboration-demo-access",
      clientId: "tsi",
      dashboardInstanceId: "collaboration-tsi-demo-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "demo-integration-access",
      clientId: "demo",
      dashboardInstanceId: "integration-demo-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "csg-dashboard-access",
      clientId: "csg",
      dashboardInstanceId: "csg-integration-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "dws-dashboard-access",
      clientId: "dws",
      dashboardInstanceId: "employee-experience-v1-dws-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "dws-field-dashboard-access",
      clientId: "dws",
      dashboardInstanceId: "employee-experience-v1-dws-field-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "tf-collaboration-access",
      clientId: "tf",
      dashboardInstanceId: "tf-collaboration-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "tsi-collaboration-access",
      clientId: "tsi",
      dashboardInstanceId: "tsi-collaboration-instance",
      status: "active",
      published: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export async function getFirebaseDashboards() {
  try {
    const defaultDashboards = buildDefaultDashboards();
    const snapshot = await getFirebaseAdminFirestore().collection(DASHBOARDS_COLLECTION).get();

    if (snapshot.empty) {
      return defaultDashboards;
    }

    return mergeDashboards(
      snapshot.docs.map((doc) => doc.data() as PortalDashboard),
      defaultDashboards
    );
  } catch (error) {
    console.error("Failed to read Firebase dashboards; falling back to defaults.", error);
    return buildDefaultDashboards();
  }
}

export async function getFirebaseDashboardById(dashboardId: string) {
  const dashboards = await getFirebaseDashboards();
  return dashboards.find((dashboard) => dashboard.id === dashboardId) ?? null;
}

export async function getFirebaseDashboardInstancesByDashboardId(dashboardId: string) {
  const instances = await getFirebaseDashboardInstances();
  return instances.filter((instance) => instance.dashboardId === dashboardId);
}

interface CreateFirebaseDashboardInput {
  assetId: string;
  family: PortalDashboard["family"];
  title: string;
  versionLabel?: string | null;
  description: string;
  status?: PortalDashboard["status"];
  categoryLabels?: string[];
}

interface UpdateFirebaseDashboardInput {
  dashboardId: string;
  assetId?: string;
  family?: PortalDashboard["family"];
  title?: string;
  versionLabel?: string | null;
  description?: string;
  status?: PortalDashboard["status"];
  categoryLabels?: string[];
}

export async function createFirebaseDashboard(input: CreateFirebaseDashboardInput) {
  const dashboards = await getFirebaseDashboards();
  const versionLabel = normalizeVersionLabel(input.versionLabel);
  const dashboardId = `${slugify(input.title)}-${slugify(versionLabel)}`;

  if (dashboards.some((dashboard) => dashboard.id === dashboardId)) {
    throw new Error("A dashboard product with this title and version already exists.");
  }

  const timestamp = nowIso();
  const dashboard: PortalDashboard = {
    id: dashboardId,
    assetId: input.assetId.trim(),
    family: input.family,
    title: input.title.trim(),
    versionLabel,
    categoryLabels: normalizeCategoryLabels(input.categoryLabels),
    categoryIds: buildCategoryIds(input.categoryLabels),
    description: input.description.trim(),
    status: input.status ?? "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(DASHBOARDS_COLLECTION)
    .doc(dashboard.id)
    .set(dashboard, { merge: true });

  return dashboard;
}

export async function updateFirebaseDashboard(input: UpdateFirebaseDashboardInput) {
  const existingDashboard = await getFirebaseDashboardById(input.dashboardId);

  if (!existingDashboard) {
    throw new Error("Dashboard product not found.");
  }

  const updatedDashboard: PortalDashboard = {
    ...existingDashboard,
    assetId: input.assetId?.trim() || existingDashboard.assetId,
    family: input.family ?? existingDashboard.family,
    title: input.title?.trim() || existingDashboard.title,
    versionLabel:
      input.versionLabel !== undefined
        ? normalizeVersionLabel(input.versionLabel)
        : existingDashboard.versionLabel,
    categoryLabels:
      input.categoryLabels !== undefined
        ? normalizeCategoryLabels(input.categoryLabels)
        : existingDashboard.categoryLabels,
    categoryIds:
      input.categoryLabels !== undefined
        ? buildCategoryIds(input.categoryLabels)
        : existingDashboard.categoryIds,
    description: input.description?.trim() || existingDashboard.description,
    status: input.status ?? existingDashboard.status,
    updatedAt: nowIso(),
  };

  await getFirebaseAdminFirestore()
    .collection(DASHBOARDS_COLLECTION)
    .doc(existingDashboard.id)
    .set(updatedDashboard, { merge: true });

  return updatedDashboard;
}

export async function getFirebaseDashboardInstances() {
  try {
    const defaultInstances = buildDefaultDashboardInstances();
    const snapshot = await getFirebaseAdminFirestore()
      .collection(DASHBOARD_INSTANCES_COLLECTION)
      .get();

    if (snapshot.empty) {
      return defaultInstances;
    }

    return mergeDashboardInstances(
      snapshot.docs.map((doc) => doc.data() as PortalDashboardInstance),
      defaultInstances
    );
  } catch (error) {
    console.error("Failed to read Firebase dashboard instances; falling back to defaults.", error);
    return buildDefaultDashboardInstances();
  }
}

export async function getFirebaseDashboardInstanceById(instanceId: string) {
  const instances = await getFirebaseDashboardInstances();
  return instances.find((instance) => instance.id === instanceId) ?? null;
}

export async function getFirebaseDashboardAccessGrants() {
  try {
    const defaultGrants = buildDefaultDashboardAccessGrants();
    const snapshot = await getFirebaseAdminFirestore()
      .collection(DASHBOARD_ACCESS_GRANTS_COLLECTION)
      .get();

    if (snapshot.empty) {
      return defaultGrants;
    }

    return mergeDashboardAccessGrants(
      snapshot.docs.map((doc) => doc.data() as PortalDashboardAccessGrant),
      defaultGrants
    );
  } catch (error) {
    console.error("Failed to read Firebase dashboard access grants; falling back to defaults.", error);
    return buildDefaultDashboardAccessGrants();
  }
}

export async function getFirebaseDashboardAccessGrantsByInstanceId(instanceId: string) {
  const grants = await getFirebaseDashboardAccessGrants();
  return grants.filter((grant) => grant.dashboardInstanceId === instanceId);
}

export async function getFirebaseDashboardAssignments(): Promise<PortalDashboardAssignment[]> {
  const [instances, grants] = await Promise.all([
    getFirebaseDashboardInstances(),
    getFirebaseDashboardAccessGrants(),
  ]);
  const instanceMap = new Map(instances.map((instance) => [instance.id, instance]));
  const assignments: PortalDashboardAssignment[] = [];

  for (const grant of grants) {
    if (grant.status === "hidden") {
      continue;
    }

    const instance = instanceMap.get(grant.dashboardInstanceId);

    if (!instance) {
      continue;
    }

    assignments.push({
      id: grant.id,
      clientId: grant.clientId,
      dashboardInstanceId: instance.id,
      assetId: instance.assetId,
      title: instance.title,
      description: instance.description,
      href: `/portal/dashboards/${instance.assetId}`,
      previewHref: instance.previewHref,
      status: grant.status,
      published: grant.published,
      createdAt: grant.createdAt ?? instance.createdAt,
      updatedAt: grant.updatedAt ?? instance.updatedAt,
    });
  }

  return assignments;
}

interface SyncDashboardAccessGrantInput {
  instanceId: string;
  grants: Array<{
    id?: string;
    clientId: string;
    status: PortalDashboardAccessGrant["status"];
    published: boolean;
  }>;
}

function buildGrantId(instanceId: string, clientId: string) {
  return `${instanceId}-${clientId}-access`;
}

interface UpdateFirebaseDashboardInstanceInput {
  instanceId: string;
  title?: string;
  description?: string;
  family?: PortalDashboardInstance["family"];
  previewHref?: string | null;
  internalNotes?: string | null;
  status?: PortalDashboardInstance["settings"]["status"];
  visibilityThreshold?: number | null;
  hiddenDimensionIds?: string[];
  redesignEnabled?: boolean;
  dataSourceLabel?: string;
  dataSourceKind?: PortalDashboardInstance["dataSource"]["kind"];
  dataSourceSourceClientId?: string | null;
  dataSourceNotes?: string | null;
  dataMappingStatus?: NonNullable<PortalDashboardInstance["dataMapping"]>["status"];
  dataMappingFieldMappings?: Record<string, string>;
  dataMappingNotes?: string | null;
}

export async function updateFirebaseDashboardInstance(input: UpdateFirebaseDashboardInstanceInput) {
  const existingInstance = await getFirebaseDashboardInstanceById(input.instanceId);

  if (!existingInstance) {
    throw new Error("Dashboard instance not found.");
  }

  const family = input.family ?? existingInstance.family;
  const preset = getDashboardDataMappingPreset(family);
  const nextFieldMappings = {
    ...buildEmptyDashboardFieldMappings(family),
    ...(existingInstance.dataMapping?.fieldMappings ?? {}),
    ...(input.dataMappingFieldMappings ?? {}),
  };
  const nextValidation = validateDashboardFieldMappings(family, nextFieldMappings);
  const requestedMappingStatus =
    input.dataMappingStatus ??
    existingInstance.dataMapping?.status ??
    "draft";
  const nextMappingStatus =
    requestedMappingStatus === "validated" && nextValidation.missingRequiredFields.length > 0
      ? "error"
      : requestedMappingStatus;
  const nextWarnings =
    requestedMappingStatus === "validated" && nextValidation.missingRequiredFields.length > 0
      ? [
          ...nextValidation.warnings,
          "Validation was blocked because one or more required fields are still missing.",
        ]
      : nextValidation.warnings;

  const updatedInstance: PortalDashboardInstance = {
    ...existingInstance,
    title: input.title ?? existingInstance.title,
    description: input.description ?? existingInstance.description,
    family: input.family ?? existingInstance.family,
    previewHref:
      input.previewHref !== undefined ? input.previewHref ?? undefined : existingInstance.previewHref,
    internalNotes:
      input.internalNotes !== undefined ? input.internalNotes : existingInstance.internalNotes ?? null,
    dataSource: {
      ...existingInstance.dataSource,
      label: input.dataSourceLabel ?? existingInstance.dataSource.label,
      kind: input.dataSourceKind ?? existingInstance.dataSource.kind,
      sourceClientId:
        input.dataSourceSourceClientId !== undefined
          ? input.dataSourceSourceClientId
          : existingInstance.dataSource.sourceClientId,
      notes:
        input.dataSourceNotes !== undefined
          ? input.dataSourceNotes
          : existingInstance.dataSource.notes,
    },
    dataMapping: {
      schemaId: preset.schemaId,
      status: nextMappingStatus,
      fieldMappings: nextFieldMappings,
      notes:
        input.dataMappingNotes !== undefined
          ? input.dataMappingNotes
          : existingInstance.dataMapping?.notes ?? null,
      validation: {
        missingRequiredFields: nextValidation.missingRequiredFields,
        warnings: nextWarnings,
        lastValidatedAt: nowIso(),
      },
    },
    settings: {
      ...existingInstance.settings,
      status: input.status ?? existingInstance.settings.status,
      visibilityThreshold:
        input.visibilityThreshold !== undefined
          ? input.visibilityThreshold
          : existingInstance.settings.visibilityThreshold,
      hiddenDimensionIds:
        input.hiddenDimensionIds !== undefined
          ? input.hiddenDimensionIds
          : existingInstance.settings.hiddenDimensionIds,
      redesignEnabled:
        input.redesignEnabled !== undefined
          ? input.redesignEnabled
          : existingInstance.settings.redesignEnabled,
    },
    updatedAt: nowIso(),
  };

  await getFirebaseAdminFirestore()
    .collection(DASHBOARD_INSTANCES_COLLECTION)
    .doc(input.instanceId)
    .set(updatedInstance, { merge: true });

  return updatedInstance;
}

interface CreateDashboardInstanceFromDashboardInput {
  dashboardId: string;
  clientId: string;
  clientName: string;
  clientIsDemo?: boolean;
  published?: boolean;
}

export async function createDashboardInstanceFromDashboard(
  input: CreateDashboardInstanceFromDashboardInput
) {
  const [dashboard, instances] = await Promise.all([
    getFirebaseDashboardById(input.dashboardId),
    getFirebaseDashboardInstances(),
  ]);

  if (!dashboard) {
    throw new Error("Dashboard product not found.");
  }

  const existingInstance = instances.find(
    (instance) =>
      instance.dashboardId === input.dashboardId &&
      instance.dataSource.sourceClientId === input.clientId
  );

  if (existingInstance) {
    return existingInstance;
  }

  const timestamp = nowIso();
  const instanceId = `${input.dashboardId}-${input.clientId}-instance`;
  const instance: PortalDashboardInstance = {
    id: instanceId,
    dashboardId: input.dashboardId,
    assetId: `${dashboard.assetId}--${input.clientId}`,
    family: dashboard.family,
    title: dashboard.title,
    description: dashboard.description,
    internalNotes: null,
    dataSource: {
      kind: input.clientIsDemo ? "synthetic_demo" : "firebase_csv_workspace",
      label: input.clientIsDemo
        ? `${input.clientName} synthetic demo dataset`
        : `${input.clientName} data workspace`,
      sourceClientId: input.clientId,
      notes: input.clientIsDemo
        ? "Synthetic demo dataset for workspace previews."
        : `Workspace-bound dashboard instance for ${input.clientName}.`,
    },
    dataMapping: buildDefaultDataMapping(dashboard.family),
    settings: {
      status: "active",
      visibilityThreshold: null,
      hiddenDimensionIds: [],
    },
    perspectiveCount: 0,
    reportCount: 0,
    lastUsedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const grant: PortalDashboardAccessGrant = {
    id: buildGrantId(instanceId, input.clientId),
    clientId: input.clientId,
    dashboardInstanceId: instanceId,
    status: "active",
    published: input.published ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const firestore = getFirebaseAdminFirestore();
  await firestore.collection(DASHBOARD_INSTANCES_COLLECTION).doc(instanceId).set(instance, { merge: true });
  await firestore
    .collection(DASHBOARD_ACCESS_GRANTS_COLLECTION)
    .doc(grant.id)
    .set(grant, { merge: true });
  await createPerspectiveInstancesForDashboardInstance(input.dashboardId, instanceId);

  return instance;
}

export async function syncFirebaseDashboardAccessGrants(input: SyncDashboardAccessGrantInput) {
  const firestore = getFirebaseAdminFirestore();
  const existingGrants = await getFirebaseDashboardAccessGrantsByInstanceId(input.instanceId);
  const existingGrantByClientId = new Map(existingGrants.map((grant) => [grant.clientId, grant]));
  const batch = firestore.batch();
  const timestamp = nowIso();

  for (const grantInput of input.grants) {
    const existingGrant = existingGrantByClientId.get(grantInput.clientId);
    const grantId = grantInput.id ?? existingGrant?.id ?? buildGrantId(input.instanceId, grantInput.clientId);

    const nextGrant: PortalDashboardAccessGrant = {
      id: grantId,
      clientId: grantInput.clientId,
      dashboardInstanceId: input.instanceId,
      status: grantInput.status,
      published: grantInput.published,
      createdAt: existingGrant?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    batch.set(
      firestore.collection(DASHBOARD_ACCESS_GRANTS_COLLECTION).doc(grantId),
      nextGrant,
      { merge: true }
    );
  }

  await batch.commit();

  return getFirebaseDashboardAccessGrantsByInstanceId(input.instanceId);
}

export async function seedDefaultDashboardAssignments() {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  buildDefaultDashboards().forEach((dashboard) => {
    batch.set(firestore.collection(DASHBOARDS_COLLECTION).doc(dashboard.id), dashboard, {
      merge: true,
    });
  });

  buildDefaultDashboardInstances().forEach((instance) => {
    batch.set(
      firestore.collection(DASHBOARD_INSTANCES_COLLECTION).doc(instance.id),
      instance,
      { merge: true }
    );
  });

  buildDefaultDashboardAccessGrants().forEach((grant) => {
    batch.set(
      firestore.collection(DASHBOARD_ACCESS_GRANTS_COLLECTION).doc(grant.id),
      grant,
      { merge: true }
    );
  });

  await batch.commit();
}

export async function getDashboardDirectoryEntries() {
  const [dashboards, instances, grants, perspectiveInstances] = await Promise.all([
    getFirebaseDashboards(),
    getFirebaseDashboardInstances(),
    getFirebaseDashboardAccessGrants(),
    getDashboardPerspectiveInstances(),
  ]);
  const dashboardsById = new Map(dashboards.map((dashboard) => [dashboard.id, dashboard]));

  const accessByInstanceId = new Map<string, PortalDashboardAccessGrant[]>();
  for (const grant of grants) {
    const current = accessByInstanceId.get(grant.dashboardInstanceId) ?? [];
    current.push(grant);
    accessByInstanceId.set(grant.dashboardInstanceId, current);
  }

  const perspectiveCountByDashboardId = new Map<string, number>();
  for (const perspectiveInstance of perspectiveInstances) {
    perspectiveCountByDashboardId.set(
      perspectiveInstance.dashboardInstanceId,
      (perspectiveCountByDashboardId.get(perspectiveInstance.dashboardInstanceId) ?? 0) + 1
    );
  }

  const instanceEntries = instances.map((instance) => {
    const relatedGrants = accessByInstanceId.get(instance.id) ?? [];
    return {
      ...instance,
      dashboard: dashboardsById.get(instance.dashboardId) ?? null,
      perspectiveCount: perspectiveCountByDashboardId.get(instance.id) ?? instance.perspectiveCount,
      clientAccessCount: relatedGrants.filter((grant) => grant.status !== "hidden").length,
      publishedAccessCount: relatedGrants.filter((grant) => grant.published && grant.status !== "hidden").length,
      accessGrants: relatedGrants,
    };
  });

  const instanceCountByDashboardId = new Map<string, number>();
  for (const entry of instanceEntries) {
    instanceCountByDashboardId.set(
      entry.dashboardId,
      (instanceCountByDashboardId.get(entry.dashboardId) ?? 0) + 1
    );
  }

  const dashboardEntries = dashboards.map((dashboard) => ({
    ...dashboard,
    instanceCount: instanceCountByDashboardId.get(dashboard.id) ?? 0,
  }));

  return {
    dashboards: dashboardEntries,
    instances: instanceEntries,
  };
}
