// Checks the TSI employee experience CSVs in Firebase Storage against what the
// dashboard loader expects (file names, DEPT/REG + Role columns, item columns).
// Usage: node scripts/verify-tsi-ee-upload.mjs
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

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const bucket = getStorage().bucket();
const [listing] = await bucket.getFiles({ prefix: "clients/tsi/" });
console.log("Files under clients/tsi/:");
listing.forEach((f) => console.log("  ", JSON.stringify(f.name), f.metadata.size));

async function read(name) {
  const file = bucket.file(`clients/tsi/data/${name}`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  return parseCSV(buf.toString("utf8").replace(/^﻿/, ""));
}

const statements = await read("TSi EE Statements.csv");
const database = await read("TSi EE Database.csv");
console.log("\nStatements file found:", Boolean(statements), "| Database file found:", Boolean(database));
if (!statements || !database) process.exit(1);

const sHead = statements[0].map((h) => h.trim().toLowerCase());
console.log("\nStatements headers:", statements[0]);
const idIdx = ["item", "item id", "itemid", "id"].map((n) => sHead.indexOf(n)).find((i) => i >= 0) ?? 0;
const dimIdx = ["index", "dimension"].map((n) => sHead.indexOf(n)).find((i) => i >= 0) ?? 1;
const stmts = statements.slice(1).map((r) => ({ id: r[idIdx]?.trim(), index: r[dimIdx]?.trim() }));
const byIndex = {};
stmts.forEach((s) => { byIndex[s.index] = (byIndex[s.index] ?? 0) + 1; });
console.log("Statements per index:", byIndex);

const headers = database[0].map((h) => h.trim());
const lower = headers.map((h) => h.toLowerCase());
console.log("\nDatabase headers:", headers);
const col = (names) => names.map((n) => lower.indexOf(n.toLowerCase())).find((i) => i >= 0);
const required = {
  Campaign: col(["Campaign"]),
  "DEPT/REG": col(["DEPT/REG", "Dept/Reg", "DEPT / REG", "Department", "Dept"]),
  Role: col(["Role"]),
  Supervisor: col(["Supervisor", "Manager"]),
  Status: col(["Status"]),
  Tenure: col(["Tenure", "Years of Service"]),
};
console.log("Column matches (index, undefined = missing):", required);

const rows = database.slice(1);
const statusIdx = required.Status;
const complete = rows.filter((r) => statusIdx === undefined || !r[statusIdx]?.trim() || r[statusIdx].trim().toLowerCase() === "complete");
console.log(`\nRows: ${rows.length}, counted (status complete/blank): ${complete.length}`);

const tally = (idx) => {
  if (idx === undefined) return null;
  const t = {};
  complete.forEach((r) => { const v = r[idx]?.trim() || "(blank)"; t[v] = (t[v] ?? 0) + 1; });
  return t;
};
console.log("Campaigns:", tally(required.Campaign));
console.log("DEPT/REG:", tally(required["DEPT/REG"]));
console.log("Role:", tally(required.Role));
const sup = tally(required.Supervisor);
console.log("Supervisors:", sup ? Object.keys(sup).length : "missing");

const scoring = stmts.filter((s) => !["comment", "ownership"].includes((s.index ?? "").toLowerCase()));
const missingItems = scoring.filter((s) => !lower.includes(`item:${s.id}`) && !lower.includes(String(s.id)));
console.log(`\nScoring statements: ${scoring.length}, without a matching database column: ${missingItems.length}`, missingItems.slice(0, 10).map((s) => s.id));
const sampleIdx = lower.findIndex((h) => h.startsWith("item:") || /^\d+$/.test(h));
if (sampleIdx >= 0) {
  const vals = complete.map((r) => Number.parseFloat(r[sampleIdx])).filter(Number.isFinite);
  console.log(`Sample score column ${headers[sampleIdx]}: min ${Math.min(...vals)}, max ${Math.max(...vals)} (expect 0-100)`);
}

// Score scale + open-text coverage.
const scoreValues = {};
scoring.forEach((s) => {
  const idx = lower.indexOf(`item:${s.id}`) >= 0 ? lower.indexOf(`item:${s.id}`) : lower.indexOf(String(s.id));
  complete.forEach((r) => {
    const v = r[idx]?.trim();
    if (v) scoreValues[v] = (scoreValues[v] ?? 0) + 1;
  });
});
console.log("\nDistinct score values (value: count):", scoreValues);
const tIdx = ["item text", "statement", "question"].map((n) => sHead.indexOf(n)).find((i) => i >= 0) ?? 2;
statements.slice(1).filter((r) => (r[dimIdx] ?? "").trim().toLowerCase() === "comment").forEach((r) => {
  const idx = lower.indexOf(`item:${r[idIdx]}`) >= 0 ? lower.indexOf(`item:${r[idIdx]}`) : lower.indexOf(String(r[idIdx]).trim());
  const answered = idx >= 0 ? complete.filter((row) => row[idx]?.trim()).length : "no column";
  console.log(`Comment item ${r[idIdx]} (${answered} answers): ${r[tIdx]}`);
});
