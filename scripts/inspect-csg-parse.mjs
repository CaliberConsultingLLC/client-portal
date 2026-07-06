import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const nextChar = text[index + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentField += '"'; index += 1; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) { currentRow.push(currentField.trim()); currentField = ""; continue; }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      currentRow.push(currentField.trim()); rows.push(currentRow); currentRow = []; currentField = ""; continue;
    }
    currentField += char;
  }
  if (currentField.length > 0 || currentRow.length > 0) { currentRow.push(currentField.trim()); rows.push(currentRow); }
  return rows;
}

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
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
const [dbBuf, stmtBuf] = await Promise.all([
  bucket.file("clients/csg/data/Canopy Services Database.csv").download(),
  bucket.file("clients/csg/data/Canopy Services Campaign Statements.csv").download(),
]);

const dbRows = parseCSV(dbBuf.toString("utf8").replace(/^\uFEFF/, ""));
const stmtRows = parseCSV(stmtBuf.toString("utf8").replace(/^\uFEFF/, ""));
const headers = dbRows[0];
const headerIndex = new Map(headers.map((h, i) => [h, i]));
const getValue = (row, field) => {
  const idx = headerIndex.get(field);
  return typeof idx === "number" ? row[idx] ?? "" : "";
};

const statuses = {};
let complete = 0;
for (const row of dbRows.slice(1)) {
  const s = getValue(row, "Status").trim().toLowerCase();
  statuses[s] = (statuses[s] ?? 0) + 1;
  if (s === "complete") complete++;
}

const stmtIds = stmtRows.slice(1).map((r) => Number.parseInt(r[0], 10)).filter(Number.isFinite);
const sampleComplete = dbRows.slice(1).find((r) => getValue(r, "Status").trim().toLowerCase() === "complete");

console.log(JSON.stringify({
  totalRows: dbRows.length - 1,
  completeRows: complete,
  statusBreakdown: statuses,
  statementItemIds: stmtIds.slice(0, 10),
  statementCount: stmtIds.length,
  numericHeaders: headers.filter((h) => /^\d+$/.test(h)).slice(0, 5),
  itemPrefixedHeaders: headers.filter((h) => h.startsWith("item:")).length,
  campaigns: [...new Set(dbRows.slice(1).map((r) => getValue(r, "Campaign")).filter(Boolean))],
  sampleCompleteScores: sampleComplete ? stmtIds.slice(0, 5).map((id) => ({ id, val: sampleComplete[headers.indexOf(String(id))] ?? sampleComplete[headers.indexOf(`item:${id}`)] })) : null,
}, null, 2));
