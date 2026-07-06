import type { PortalReport, ReportInstance } from "@/types/portal";
import { getFirebaseAdminFirestore } from "./admin";

const REPORTS_COLLECTION = "reports";
const REPORT_INSTANCES_COLLECTION = "reportInstances";

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

function mergeById<T extends { id: string }>(existingDocs: T[], defaultDocs: T[]) {
  const merged = new Map(defaultDocs.map((doc) => [doc.id, doc]));
  existingDocs.forEach((doc) => {
    merged.set(doc.id, doc);
  });
  return Array.from(merged.values());
}

export function buildDefaultReports(): PortalReport[] {
  return [];
}

export function buildDefaultReportInstances(): ReportInstance[] {
  return [];
}

export async function getFirebaseReports() {
  try {
    const defaults = buildDefaultReports();
    const snapshot = await getFirebaseAdminFirestore().collection(REPORTS_COLLECTION).get();

    if (snapshot.empty) {
      return defaults;
    }

    return mergeById(snapshot.docs.map((doc) => doc.data() as PortalReport), defaults);
  } catch (error) {
    console.error("Failed to read Firebase reports; falling back to defaults.", error);
    return buildDefaultReports();
  }
}

export async function getFirebaseReportById(reportId: string) {
  const reports = await getFirebaseReports();
  return reports.find((report) => report.id === reportId) ?? null;
}

export async function getFirebaseReportInstances() {
  try {
    const defaults = buildDefaultReportInstances();
    const snapshot = await getFirebaseAdminFirestore().collection(REPORT_INSTANCES_COLLECTION).get();

    if (snapshot.empty) {
      return defaults;
    }

    return mergeById(snapshot.docs.map((doc) => doc.data() as ReportInstance), defaults);
  } catch (error) {
    console.error("Failed to read Firebase report instances; falling back to defaults.", error);
    return buildDefaultReportInstances();
  }
}

export async function getFirebaseReportInstancesByReportId(reportId: string) {
  const instances = await getFirebaseReportInstances();
  return instances.filter((instance) => instance.reportId === reportId);
}

export async function getFirebaseReportInstancesByClientIds(clientIds: string[]) {
  const instances = await getFirebaseReportInstances();
  return instances.filter((instance) => clientIds.includes(instance.clientId));
}

interface CreateFirebaseReportInput {
  dashboardId: string;
  perspectiveId?: string | null;
  title: string;
  versionLabel?: string | null;
  description: string;
  status?: PortalReport["status"];
  notes?: string | null;
}

interface UpdateFirebaseReportInput {
  reportId: string;
  dashboardId?: string;
  perspectiveId?: string | null;
  title?: string;
  versionLabel?: string | null;
  description?: string;
  status?: PortalReport["status"];
  notes?: string | null;
}

export async function createFirebaseReport(input: CreateFirebaseReportInput) {
  const reports = await getFirebaseReports();
  const versionLabel = normalizeVersionLabel(input.versionLabel);
  const reportId = `${slugify(input.title)}-${slugify(versionLabel)}`;

  if (reports.some((report) => report.id === reportId)) {
    throw new Error("A report product with this title and version already exists.");
  }

  const timestamp = nowIso();
  const report: PortalReport = {
    id: reportId,
    dashboardId: input.dashboardId,
    perspectiveId: input.perspectiveId ?? null,
    title: input.title.trim(),
    versionLabel,
    description: input.description.trim(),
    status: input.status ?? "active",
    notes: input.notes?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(REPORTS_COLLECTION)
    .doc(report.id)
    .set(report, { merge: true });

  return report;
}

export async function updateFirebaseReport(input: UpdateFirebaseReportInput) {
  const existingReport = await getFirebaseReportById(input.reportId);

  if (!existingReport) {
    throw new Error("Report product not found.");
  }

  const updatedReport: PortalReport = {
    ...existingReport,
    dashboardId: input.dashboardId ?? existingReport.dashboardId,
    perspectiveId:
      input.perspectiveId !== undefined ? input.perspectiveId : existingReport.perspectiveId,
    title: input.title?.trim() || existingReport.title,
    versionLabel:
      input.versionLabel !== undefined
        ? normalizeVersionLabel(input.versionLabel)
        : existingReport.versionLabel,
    description: input.description?.trim() || existingReport.description,
    status: input.status ?? existingReport.status,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existingReport.notes,
    updatedAt: nowIso(),
  };

  await getFirebaseAdminFirestore()
    .collection(REPORTS_COLLECTION)
    .doc(existingReport.id)
    .set(updatedReport, { merge: true });

  return updatedReport;
}

interface CreateReportInstanceFromReportInput {
  reportId: string;
  clientId: string;
  title?: string;
  status?: ReportInstance["status"];
  campaignLabel?: string | null;
  publishedOn?: string | null;
  href?: string | null;
  downloadHref?: string | null;
  notes?: string | null;
}

export async function createReportInstanceFromReport(input: CreateReportInstanceFromReportInput) {
  const [report, instances] = await Promise.all([
    getFirebaseReportById(input.reportId),
    getFirebaseReportInstancesByReportId(input.reportId),
  ]);

  if (!report) {
    throw new Error("Report product not found.");
  }

  const existingInstance = instances.find((instance) => instance.clientId === input.clientId);

  if (existingInstance) {
    return existingInstance;
  }

  const timestamp = nowIso();
  const instance: ReportInstance = {
    id: `${report.id}-${input.clientId}-instance`,
    reportId: report.id,
    dashboardId: report.dashboardId,
    perspectiveId: report.perspectiveId ?? null,
    clientId: input.clientId,
    title: input.title?.trim() || report.title,
    description: report.description,
    versionLabel: report.versionLabel,
    status: input.status ?? "active",
    campaignLabel: input.campaignLabel?.trim() || null,
    publishedOn: input.publishedOn?.trim() || null,
    href: input.href?.trim() || null,
    downloadHref: input.downloadHref?.trim() || null,
    notes: input.notes?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await getFirebaseAdminFirestore()
    .collection(REPORT_INSTANCES_COLLECTION)
    .doc(instance.id)
    .set(instance, { merge: true });

  return instance;
}

export async function seedDefaultReportCollections() {
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  buildDefaultReports().forEach((report) => {
    batch.set(firestore.collection(REPORTS_COLLECTION).doc(report.id), report, { merge: true });
  });

  buildDefaultReportInstances().forEach((instance) => {
    batch.set(firestore.collection(REPORT_INSTANCES_COLLECTION).doc(instance.id), instance, {
      merge: true,
    });
  });

  await batch.commit();
}

export async function getReportDirectoryEntries() {
  const [reports, instances] = await Promise.all([
    getFirebaseReports(),
    getFirebaseReportInstances(),
  ]);

  const instanceCountByReportId = new Map<string, number>();
  for (const instance of instances) {
    if (instance.status !== "active") {
      continue;
    }

    instanceCountByReportId.set(
      instance.reportId,
      (instanceCountByReportId.get(instance.reportId) ?? 0) + 1
    );
  }

  return {
    reports: reports.map((report) => ({
      ...report,
      activeInstanceCount: instanceCountByReportId.get(report.id) ?? 0,
    })),
    instances,
  };
}
