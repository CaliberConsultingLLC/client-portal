import { randomUUID } from "crypto";
import { getFirebaseAdminFirestore, getFirebaseAdminStorage } from "./admin";
import type { CensusPreview, CensusUploadSummary } from "@/types/census";

const CENSUS_UPLOADS_COLLECTION = "censusUploads";
const PREVIEW_ROW_LIMIT = 200;
const EMPLOYEE_ID_COLUMN_ALIASES = new Set([
  "id",
  "eid",
  "employee id",
  "employeeid",
  "employee_id",
  "employee number",
  "employee_number",
]);
const DEPARTMENT_COLUMN_ALIASES = new Set([
  "department",
  "dept",
  "division",
  "team",
  "business unit",
  "business_unit",
]);

interface SaveCensusUploadInput {
  clientId: string;
  surveyId: string;
  surveyLabel: string;
  dashboardAssetId?: string | null;
  dashboardTitle?: string | null;
  fileName: string;
  csvText: string;
  uploadedByUid: string;
  uploadedByEmail?: string | null;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function findColumn(headers: string[], aliases: Set<string>) {
  return headers.find((header) => aliases.has(normalizeHeader(header))) ?? null;
}

function buildDepartmentCounts(rows: Record<string, string>[], departmentColumn: string | null) {
  if (!departmentColumn) {
    return [];
  }

  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const department = row[departmentColumn]?.trim() || "Unassigned";
    counts.set(department, (counts.get(department) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([department, employeeCount]) => ({ department, employeeCount }))
    .sort((left, right) => right.employeeCount - left.employeeCount || left.department.localeCompare(right.department));
}

function toRecords(rows: string[][]) {
  const headers = rows[0]?.map((header) => header.trim()).filter(Boolean) ?? [];
  const records = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]))
  );

  return {
    headers,
    records: records.filter((record) => Object.values(record).some((value) => value.length > 0)),
  };
}

export function parseCensusCsv(csvText: string) {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
  const { headers, records } = toRecords(rows);
  const employeeIdColumn = findColumn(headers, EMPLOYEE_ID_COLUMN_ALIASES);

  if (headers.length === 0 || records.length === 0) {
    throw new Error("The census file must include a header row and at least one employee row.");
  }

  if (!employeeIdColumn) {
    throw new Error("The census file must include an employee ID column named ID, EID, or Employee ID.");
  }

  const missingEmployeeIds = records.filter((record) => !record[employeeIdColumn]?.trim()).length;
  if (missingEmployeeIds > 0) {
    throw new Error(`The employee ID column has ${missingEmployeeIds} blank value(s).`);
  }

  const duplicateEmployeeIds = new Set<string>();
  const seenEmployeeIds = new Set<string>();
  records.forEach((record) => {
    const employeeId = record[employeeIdColumn].trim();
    if (seenEmployeeIds.has(employeeId)) {
      duplicateEmployeeIds.add(employeeId);
    }
    seenEmployeeIds.add(employeeId);
  });

  if (duplicateEmployeeIds.size > 0) {
    throw new Error("The employee ID column must be unique within this survey census file.");
  }

  const departmentColumn = findColumn(headers, DEPARTMENT_COLUMN_ALIASES);

  return {
    columns: headers,
    rows: records,
    employeeIdColumn,
    departmentColumn,
    departmentCounts: buildDepartmentCounts(records, departmentColumn),
  };
}

export async function saveCensusUpload(input: SaveCensusUploadInput) {
  const parsed = parseCensusCsv(input.csvText);
  const timestamp = nowIso();
  const uploadId = randomUUID();
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePrefix = `clients/${input.clientId}/census/${uploadId}`;
  const rawStoragePath = `${storagePrefix}/${safeFileName || "census.csv"}`;
  const processedStoragePath = `${storagePrefix}/processed.json`;
  const bucket = getFirebaseAdminStorage().bucket();

  await bucket.file(rawStoragePath).save(input.csvText, {
    contentType: "text/csv",
    metadata: {
      metadata: {
        clientId: input.clientId,
        surveyId: input.surveyId,
        uploadId,
        dashboardAssetId: input.dashboardAssetId ?? "",
      },
    },
  });

  await bucket.file(processedStoragePath).save(
    JSON.stringify(
      {
        columns: parsed.columns,
        rows: parsed.rows,
        departmentCounts: parsed.departmentCounts,
      },
      null,
      2
    ),
    {
      contentType: "application/json",
      metadata: {
        metadata: {
          clientId: input.clientId,
          surveyId: input.surveyId,
          uploadId,
          dashboardAssetId: input.dashboardAssetId ?? "",
        },
      },
    }
  );

  const upload: CensusUploadSummary = {
    id: uploadId,
    clientId: input.clientId,
    surveyId: input.surveyId,
    surveyLabel: input.surveyLabel,
    dashboardAssetId: input.dashboardAssetId ?? null,
    dashboardTitle: input.dashboardTitle ?? null,
    fileName: input.fileName,
    rowCount: parsed.rows.length,
    columns: parsed.columns,
    employeeIdColumn: parsed.employeeIdColumn,
    departmentColumn: parsed.departmentColumn,
    rawStoragePath,
    processedStoragePath,
    status: "ready",
    uploadedByUid: input.uploadedByUid,
    uploadedByEmail: input.uploadedByEmail ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    errorMessage: null,
  };

  await getFirebaseAdminFirestore()
    .collection(CENSUS_UPLOADS_COLLECTION)
    .doc(uploadId)
    .set(upload, { merge: true });

  return upload;
}

export async function listCensusUploads(clientIds: string[]) {
  if (clientIds.length === 0) {
    return [];
  }

  const firestore = getFirebaseAdminFirestore();
  const snapshots = await Promise.all(
    Array.from({ length: Math.ceil(clientIds.length / 10) }, (_, index) =>
      clientIds.slice(index * 10, index * 10 + 10)
    ).map((chunk) =>
      firestore.collection(CENSUS_UPLOADS_COLLECTION).where("clientId", "in", chunk).get()
    )
  );

  return snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => doc.data() as CensusUploadSummary)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getCensusUploadById(uploadId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection(CENSUS_UPLOADS_COLLECTION)
    .doc(uploadId)
    .get();

  return snapshot.exists ? (snapshot.data() as CensusUploadSummary) : null;
}

export async function readRawCensusFile(upload: CensusUploadSummary) {
  const bucket = getFirebaseAdminStorage().bucket();
  const [buffer] = await bucket.file(upload.rawStoragePath).download();

  return buffer;
}

export async function listCensusUploadsForSurvey(clientId: string, surveyId: string) {
  const snapshot = await getFirebaseAdminFirestore()
    .collection(CENSUS_UPLOADS_COLLECTION)
    .where("clientId", "==", clientId)
    .where("surveyId", "==", surveyId)
    .get();

  return snapshot.docs
    .map((doc) => doc.data() as CensusUploadSummary)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function readProcessedCensus(upload: CensusUploadSummary | null): Promise<CensusPreview> {
  if (!upload) {
    return {
      upload: null,
      rows: [],
      departmentCounts: [],
    };
  }

  const bucket = getFirebaseAdminStorage().bucket();
  const [buffer] = await bucket.file(upload.processedStoragePath).download();
  const parsed = JSON.parse(buffer.toString("utf8")) as {
    rows?: Record<string, string>[];
    departmentCounts?: CensusPreview["departmentCounts"];
  };

  return {
    upload,
    rows: (parsed.rows ?? []).slice(0, PREVIEW_ROW_LIMIT),
    departmentCounts: parsed.departmentCounts ?? [],
  };
}

export async function getLatestCensusPreview(clientIds: string[]) {
  const uploads = await listCensusUploads(clientIds);
  return readProcessedCensus(uploads[0] ?? null);
}

export async function getCensusPreviewById(uploadId: string) {
  const upload = await getCensusUploadById(uploadId);
  return readProcessedCensus(upload);
}
