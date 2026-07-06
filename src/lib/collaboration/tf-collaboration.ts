import { getFirebaseAdminStorage } from "@/lib/firebase/admin";
import {
  parseCollaborationSurvey,
  type CollaborationDataset,
  type ParseCollaborationOptions,
} from "@/lib/collaboration/collaboration-dataset";

const DATABASE_STORAGE_PATH = "clients/tf/data/TF Collab Database.csv";
const STATEMENTS_STORAGE_PATH = "clients/tf/data/TF Collaboration Statements.csv";

export const TF_COLLABORATION_ORGANIZATION_NAME = "Top Flight, Inc";
export const TF_COLLABORATION_CAMPAIGN_NAME = "Collaboration Campaign";

/**
 * Department-name reconciliation for Top Flight.
 *
 * Applied to BOTH the statement "Dept Score" names and the database
 * `Department` field so the two reconcile and merged departments collapse
 * everywhere:
 * - "Production" (HR label) → "Production Floor" (survey label).
 * - "Production Control" and "Sourcing" are rated separately in the survey but
 *   staffed as one combined group in the database, so they merge into a single
 *   "Production Control & Sourcing" department.
 */
const TF_DEPARTMENT_NORMALIZE: Record<string, string> = {
  Production: "Production Floor",
  "Production Control": "Production Control & Sourcing",
  Sourcing: "Production Control & Sourcing",
};

async function readCsvFromStorage(storagePath: string): Promise<string> {
  const bucket = getFirebaseAdminStorage().bucket();
  const [buffer] = await bucket.file(storagePath).download();
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

export interface TfCollaborationDashboardData {
  dataset: CollaborationDataset;
  organizationName: string;
  campaignName: string;
}

export async function loadTopFlightCollaborationDashboardData(
  options?: ParseCollaborationOptions
): Promise<TfCollaborationDashboardData> {
  const [databaseCsv, statementsCsv] = await Promise.all([
    readCsvFromStorage(DATABASE_STORAGE_PATH),
    readCsvFromStorage(STATEMENTS_STORAGE_PATH),
  ]);

  const dataset = parseCollaborationSurvey(databaseCsv, statementsCsv, {
    departmentNormalize: TF_DEPARTMENT_NORMALIZE,
    ...options,
  });

  return {
    dataset,
    organizationName: TF_COLLABORATION_ORGANIZATION_NAME,
    campaignName: TF_COLLABORATION_CAMPAIGN_NAME,
  };
}
