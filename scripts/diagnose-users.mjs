process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
firestore.settings({ preferRest: true });

const snapshot = await firestore.collection("users").get();
const users = snapshot.docs.map((doc) => doc.data());

console.log(`Total users: ${users.length}\n`);

const byRole = {};
for (const u of users) {
  byRole[u.role] = (byRole[u.role] ?? 0) + 1;
}
console.log("Role counts:", JSON.stringify(byRole, null, 2), "\n");

console.log("All users:");
for (const u of users) {
  console.log(
    `  [${u.isActive ? "active" : "INACTIVE"}] ${u.role.padEnd(15)} ${String(u.email).padEnd(38)} clients=${JSON.stringify(u.clientIds ?? [])}`
  );
}

console.log("\nSuper admins:");
console.log(
  users.filter((u) => u.role === "super_admin").map((u) => u.email).join(", ") || "  (none)"
);

console.log("\nTSI client users (clientIds includes 'tsi'):");
const tsiUsers = users.filter((u) => (u.clientIds ?? []).includes("tsi"));
if (tsiUsers.length === 0) {
  console.log("  (none)");
} else {
  for (const u of tsiUsers) {
    console.log(`  ${u.email} — role=${u.role} active=${u.isActive}`);
  }
}
