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
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvFile(".env.local");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
}

const firestore = getFirestore();
const scopeSnapshot = await firestore
  .collection("dashboardGuidanceScopes")
  .where("dashboardInstanceId", "==", "employee-experience-v1-csg-instance")
  .get();

let deleted = 0;
const BATCH_SIZE = 300;
for (let index = 0; index < scopeSnapshot.docs.length; index += BATCH_SIZE) {
  const batch = firestore.batch();
  for (const doc of scopeSnapshot.docs.slice(index, index + BATCH_SIZE)) {
    batch.delete(doc.ref);
    deleted += 1;
  }
  await batch.commit();
}

console.log(JSON.stringify({ deleted, total: scopeSnapshot.size }));
