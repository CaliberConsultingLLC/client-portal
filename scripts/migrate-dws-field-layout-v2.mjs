// One-off migration script: promotes the DWS Field Employee Experience
// dashboard instance from a pure code-level default
// (src/lib/firebase/dashboard-store.ts buildDefaultDashboardInstances(), id
// "employee-experience-v1-dws-field-instance") into a real, standalone
// Firestore document — the same way every other live client instance (e.g.
// "employee-experience-v1-dws-instance") already exists — with
// settings.redesignEnabled: true, marking the instance as permanently
// migrated to the v2 portal layout. This is a one-way migration marker, not a
// reversible feature flag; it is not exposed anywhere in the admin settings
// UI and is only ever set through this script or a direct PATCH to
// /api/portal/dashboard-instances/employee-experience-v1-dws-field-instance.
//
// Verified before running (see conversation transcript): this document did
// NOT exist in Firestore's `dashboardInstances` collection prior to this
// script — only "employee-experience-v1-csg-instance" and
// "employee-experience-v1-dws-instance" existed there. "employee-experience--dws-field"
// is listed in PROTECTED_CLIENT_ASSET_IDS (src/lib/firebase/id-registry-audit.ts)
// as a "Known live client route", confirming this is the real production DWS
// Field instance, not a demo/legacy leftover.
//
// Field values below are copied verbatim from the code default
// (buildDefaultDashboardInstances in src/lib/firebase/dashboard-store.ts) plus
// the default employee_experience data-mapping shape (buildEmptyDashboardFieldMappings
// in src/lib/portal/data-mapping.ts), so this write changed nothing about how
// the dashboard behaved except adding settings.redesignEnabled: true.
//
// This script is idempotent-safe: it refuses to run again once the Firestore
// document exists (kept here as a record of the migration, not a repeatable tool).
import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const firestore = getFirestore();
firestore.settings({ preferRest: true });

const INSTANCE_ID = "employee-experience-v1-dws-field-instance";
const docRef = firestore.collection("dashboardInstances").doc(INSTANCE_ID);

const existingSnap = await docRef.get();
if (existingSnap.exists) {
  console.log(
    JSON.stringify(
      {
        status: "already-migrated",
        instanceId: INSTANCE_ID,
        settings: existingSnap.data()?.settings,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const timestamp = new Date().toISOString();

const EMPLOYEE_EXPERIENCE_MAPPING_FIELD_KEYS = [
  "respondentId",
  "campaign",
  "department",
  "location",
  "supervisor",
  "division",
  "jobTitle",
  "fieldCategory",
  "leadership",
  "generation",
  "rateType",
  "tenure",
  "rating",
  "statementId",
  "score",
  "strengthComment",
  "improvementComment",
  "supervisorComment",
  "acquisitionComment",
];
const REQUIRED_FIELD_LABELS = {
  campaign: "Campaign",
  department: "Department",
  location: "Brand",
  supervisor: "Supervisor",
  statementId: "Statement ID",
  score: "Score",
};

const emptyFieldMappings = Object.fromEntries(EMPLOYEE_EXPERIENCE_MAPPING_FIELD_KEYS.map((key) => [key, ""]));

const dashboardInstance = {
  id: INSTANCE_ID,
  dashboardId: "employee-experience-v1",
  assetId: "employee-experience--dws-field",
  family: "employee_experience",
  title: "Field Employee Experience",
  description:
    "Employee experience reporting for Deep Well Services field employees with campaign trends, department breakdowns, and supervisor insights.",
  previewHref: "/portal/dashboards/employee-experience--dws-field",
  internalNotes: null,
  logoUrl: null,
  dataSource: {
    kind: "firebase_csv_workspace",
    label: "Deep Well Services field employee experience workspace",
    sourceClientId: "dws-field",
    notes: "Reads field database.csv and EE field statements.csv from clients/dws/data in Firebase Storage.",
  },
  dataMapping: {
    schemaId: "employee_experience_v1",
    status: "draft",
    fieldMappings: emptyFieldMappings,
    notes: null,
    validation: {
      missingRequiredFields: Object.values(REQUIRED_FIELD_LABELS),
      warnings: ["No source fields have been mapped yet."],
      lastValidatedAt: null,
    },
  },
  settings: {
    status: "active",
    visibilityThreshold: null,
    hiddenDimensionIds: ["acquisition", "enps"],
    redesignEnabled: true,
  },
  perspectiveCount: 3,
  reportCount: 0,
  lastUsedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

await docRef.set(dashboardInstance, { merge: true });

const verifySnap = await docRef.get();
console.log(
  JSON.stringify(
    {
      status: "migrated",
      instanceId: INSTANCE_ID,
      wroteDocument: verifySnap.exists,
      settings: verifySnap.data()?.settings,
    },
    null,
    2
  )
);
