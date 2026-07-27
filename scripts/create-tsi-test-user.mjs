process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

const auth = getAuth();
const firestore = getFirestore();
firestore.settings({ preferRest: true });

const email = "tsi-demo@caliberconsultingllc.org";
const password = "TechSystems2026!";
const fullName = "Tech Systems Demo Viewer";
const role = "client_viewer";
const clientIds = ["tsi"];
const nowIso = new Date().toISOString();

let authUser;
try {
  authUser = await auth.getUserByEmail(email);
  await auth.updateUser(authUser.uid, {
    email,
    password,
    displayName: fullName,
    disabled: false,
  });
  console.log(`Updated existing auth user: ${authUser.uid}`);
} catch {
  authUser = await auth.createUser({
    email,
    password,
    displayName: fullName,
    disabled: false,
  });
  console.log(`Created new auth user: ${authUser.uid}`);
}

const docRef = firestore.collection("users").doc(authUser.uid);
const existing = await docRef.get();

await docRef.set(
  {
    uid: authUser.uid,
    email,
    fullName,
    role,
    clientIds,
    employeeExperienceAccess: {
      dashboardAccessMode: "full",
      allowedDashboardAssetIds: [],
      perspectiveAccessMode: "full",
      allowedPerspectiveIds: [],
      brandReportAccessMode: "full",
      brandReportAllowedBrands: [],
      perspectiveFilterRules: [],
    },
    isActive: true,
    createdAt: existing.exists ? existing.data().createdAt ?? nowIso : nowIso,
    updatedAt: nowIso,
  },
  { merge: true }
);

console.log("\nTSI test login ready:");
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log(`  Role:     ${role} (streamlined client viewer)`);
console.log(`  Clients:  ${JSON.stringify(clientIds)}`);
