import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

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

const bucket = getStorage().bucket();
const [dbBuf] = await bucket.file("clients/csg/data/Canopy Services Database.csv").download();
const text = dbBuf.toString("utf8");
const lines = text.split(/\r?\n/);
const headers = lines[0].split(",");

console.log("Header count:", headers.length);
console.log("Headers:", JSON.stringify(headers.slice(0, 30), null, 2));
console.log("Sample item columns:", headers.filter((h) => h.startsWith("item:")).slice(0, 5));
console.log("Has Status:", headers.includes("Status"));
console.log("Has Campaign:", headers.includes("Campaign"));
console.log("Has Location:", headers.includes("Location"));
console.log("Row count:", lines.length - 1);

const statusIdx = headers.indexOf("Status");
if (statusIdx >= 0) {
  const statuses = new Set();
  for (const line of lines.slice(1, 50)) {
    const cols = line.split(",");
    statuses.add(cols[statusIdx]?.trim());
  }
  console.log("Status values (sample):", [...statuses]);
}
