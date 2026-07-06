import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
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

const DB_PATH = "clients/tf/data/TF Collab Database.csv";
const STMT_PATH = "clients/tf/data/TF Collaboration Statements.csv";

function splitCsvLine(line) {
  const out = [];
  let field = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === "," && !q) {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

async function tryDownload(path) {
  try {
    const [buf] = await bucket.file(path).download();
    return buf.toString("utf8").replace(/^\uFEFF/, "");
  } catch (err) {
    console.log(`FAILED to download "${path}": ${err.message}`);
    return null;
  }
}

// List what's actually in clients/tf/data to confirm exact filenames
const [files] = await bucket.getFiles({ prefix: "clients/tf/" });
console.log("=== Files under clients/tf/ ===");
for (const f of files) console.log("  " + f.name);

mkdirSync(".tmp-tf", { recursive: true });

const dbText = await tryDownload(DB_PATH);
const stmtText = await tryDownload(STMT_PATH);

if (dbText) {
  writeFileSync(".tmp-tf/database.csv", dbText);
  const lines = dbText.split(/\r?\n/).filter((l) => l.length);
  const headers = splitCsvLine(lines[0]);
  console.log("\n=== DATABASE ===");
  console.log("Total columns:", headers.length);
  console.log("Total data rows:", lines.length - 1);
  console.log("Headers:", JSON.stringify(headers));
  const deptIdx = headers.findIndex((h) => h.toLowerCase() === "department");
  console.log("Department column index:", deptIdx, "->", headers[deptIdx]);
  if (deptIdx >= 0) {
    const depts = new Set();
    for (const line of lines.slice(1)) depts.add(splitCsvLine(line)[deptIdx]);
    console.log("Distinct Department values:", JSON.stringify([...depts]));
  }
  console.log("First data row:", JSON.stringify(splitCsvLine(lines[1])));
  // numeric headers
  const numericHeaders = headers.filter((h) => /^\d+$/.test(h));
  console.log("Numeric (item-id) headers count:", numericHeaders.length);
  console.log("Numeric headers:", JSON.stringify(numericHeaders));
}

if (stmtText) {
  writeFileSync(".tmp-tf/statements.csv", stmtText);
  const lines = stmtText.split(/\r?\n/).filter((l) => l.length);
  console.log("\n=== STATEMENTS ===");
  console.log("Header:", JSON.stringify(splitCsvLine(lines[0])));
  console.log("Total rows:", lines.length - 1);
  console.log("All rows:");
  for (const line of lines.slice(1)) {
    console.log("  " + JSON.stringify(splitCsvLine(line)));
  }
}
