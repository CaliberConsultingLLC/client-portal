import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

loadEnvFile(".env.local");

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const firestore = getFirestore();
const timestamp = nowIso();
const clientId = "csg";
const logoUrl = "/canopy-services-logo.png";
const dashboardId = "employee-experience-v1";
const instanceId = "employee-experience-v1-csg-instance";
const assetId = "employee-experience--csg";

const employeeExperienceMapping = {
  schemaId: "employee_experience",
  status: "draft",
  fieldMappings: {},
  notes:
    "Prepared for Canopy Services Group employee experience upload. Expected storage paths: clients/csg/data/Canopy Services Database.csv and clients/csg/data/Canopy Services Campaign Statements.csv.",
  validation: {
    missingRequiredFields: [],
    warnings: [],
    lastValidatedAt: null,
  },
};

const dashboardInstance = {
  id: instanceId,
  dashboardId,
  assetId,
  family: "employee_experience",
  title: "Canopy Services Group Employee Experience Dashboard",
  description:
    "Client-ready Employee Experience dashboard instance for Canopy Services Group, prepared for Firestore and Firebase Storage data upload.",
  previewHref: `/portal/dashboards/${assetId}`,
  internalNotes:
    "Prepared from the current EE demo dashboard for Canopy Services Group. Upload final CSV files into the csg employee experience data workspace.",
  logoUrl,
  dataSource: {
    kind: "firebase_csv_workspace",
    label: "Canopy Services Group employee experience workspace",
    sourceClientId: clientId,
    notes:
      "Reads Canopy Services Group Employee Experience CSV files from clients/csg/data once uploaded.",
  },
  dataMapping: employeeExperienceMapping,
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
};

const accessGrant = {
  id: `${instanceId}-${clientId}-access`,
  clientId,
  dashboardInstanceId: instanceId,
  status: "active",
  published: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const perspectiveItems = [
  {
    libraryItemId: "employee-experience-investigation-hub",
    suffix: "experience-investigation-hub",
    title: "Investigation Hub",
    description: "Review mode for employee experience exploration and filtering.",
    rendererKey: "employeeExperience.investigationHub",
    order: 1,
    categoryIds: ["review"],
    categoryLabels: ["Review"],
  },
  {
    libraryItemId: "employee-experience-department-report",
    suffix: "experience-department-report",
    title: "Department Report",
    description: "Department-level employee experience reporting.",
    rendererKey: "employeeExperience.departmentReport",
    order: 2,
    categoryIds: ["reports"],
    categoryLabels: ["Reports"],
  },
  {
    libraryItemId: "employee-experience-supervisor-report",
    suffix: "experience-supervisor-report",
    title: "Supervisor Report",
    description: "Supervisor-level employee experience reporting.",
    rendererKey: "employeeExperience.supervisorReport",
    order: 3,
    categoryIds: ["reports"],
    categoryLabels: ["Reports"],
  },
];

const batch = firestore.batch();

batch.set(
  firestore.collection("clients").doc(clientId),
  {
    id: clientId,
    name: "Canopy Services Group",
    shortName: "CSG",
    slug: "canopy-services-group",
    status: "active",
    logoUrl,
    updatedAt: timestamp,
  },
  { merge: true }
);

batch.set(
  firestore.collection("dashboardInstances").doc(instanceId),
  dashboardInstance,
  { merge: true }
);

batch.set(
  firestore.collection("dashboardAccessGrants").doc(accessGrant.id),
  accessGrant,
  { merge: true }
);

for (const item of perspectiveItems) {
  const perspectiveInstance = {
    id: `${instanceId}-${item.suffix}`,
    dashboardInstanceId: instanceId,
    libraryItemId: item.libraryItemId,
    title: item.title,
    description: item.description,
    rendererKey: item.rendererKey,
    order: item.order,
    categoryIds: item.categoryIds,
    categoryLabels: item.categoryLabels,
    isCustomized: false,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  batch.set(
    firestore.collection("dashboardPerspectiveInstances").doc(perspectiveInstance.id),
    perspectiveInstance,
    { merge: true }
  );
}

await batch.commit();

console.log(
  JSON.stringify(
    {
      status: "ok",
      clientId,
      dashboardInstanceId: instanceId,
      assetId,
      href: `/portal/dashboards/${assetId}`,
      logoUrl,
      storagePaths: [
        "clients/csg/data/Canopy Services Database.csv",
        "clients/csg/data/Canopy Services Campaign Statements.csv",
      ],
    },
    null,
    2
  )
);
