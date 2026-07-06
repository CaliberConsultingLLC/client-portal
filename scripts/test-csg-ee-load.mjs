import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
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
const bucket = getStorage().bucket();
const instanceId = "employee-experience-v1-csg-instance";

const instanceDoc = await firestore.collection("dashboardInstances").doc(instanceId).get();
const instance = instanceDoc.data();

const dbPath = "clients/csg/data/Canopy Services Database.csv";
const stmtPath = "clients/csg/data/Canopy Services Campaign Statements.csv";

const [dbFile, stmtFile] = await Promise.all([
  bucket.file(dbPath).download(),
  bucket.file(stmtPath).download(),
]);

const dbText = dbFile[0].toString("utf8");
const stmtText = stmtFile[0].toString("utf8");
const dbLines = dbText.trim().split(/\r?\n/);
const stmtLines = stmtText.trim().split(/\r?\n/);

console.log(
  JSON.stringify(
    {
      instanceExists: instanceDoc.exists,
      assetId: instance?.assetId ?? null,
      sourceClientId: instance?.dataSource?.sourceClientId ?? null,
      hiddenDimensionIds: instance?.settings?.hiddenDimensionIds ?? null,
      databaseRows: Math.max(0, dbLines.length - 1),
      statementRows: Math.max(0, stmtLines.length - 1),
      databaseHeader: dbLines[0]?.slice(0, 120) ?? null,
      statementsHeader: stmtLines[0]?.slice(0, 120) ?? null,
    },
    null,
    2
  )
);
