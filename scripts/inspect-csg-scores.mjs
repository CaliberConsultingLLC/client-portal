import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { createRequire } from "module";

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

// Use dynamic import after env is loaded - we'll inline the key logic instead
function parseCSV(text) {
  const rows = [];
  let currentRow = [], currentField = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"') { if (inQuotes && next === '"') { currentField += '"'; i++; } else inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { currentRow.push(currentField.trim()); currentField = ""; continue; }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      currentRow.push(currentField.trim()); rows.push(currentRow); currentRow = []; currentField = ""; continue;
    }
    currentField += char;
  }
  if (currentField.length || currentRow.length) { currentRow.push(currentField.trim()); rows.push(currentRow); }
  return rows;
}

function normalizeScore(raw) {
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) / 10 : null;
}

function parseCampaignDate(raw) {
  const [monthText, dayText, yearText] = raw.split("/");
  const month = Number.parseInt(monthText ?? "", 10) - 1;
  const day = Number.parseInt(dayText ?? "", 10);
  const year = Number.parseInt(yearText ?? "", 10);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    return { time: 0, label: raw || "Unknown Campaign" };
  }
  return { time: new Date(year, month, day).getTime(), label: raw };
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

const definitions = parseCSV(stmtBuf.toString("utf8").replace(/^\uFEFF/, "")).slice(1).map((row) => ({
  itemId: Number.parseInt(row[0], 10),
})).filter((d) => Number.isFinite(d.itemId));

const rows = parseCSV(dbBuf.toString("utf8").replace(/^\uFEFF/, ""));
const headers = rows[0];
const headerIndex = new Map(headers.map((h, i) => [h, i]));
const getValue = (row, field) => {
  const idx = headerIndex.get(field);
  return typeof idx === "number" ? row[idx] ?? "" : "";
};

const questionIds = definitions.map((d) => d.itemId);
let withScoresOld = 0, withScoresNew = 0;
const campaigns = new Set();

for (const row of rows.slice(1)) {
  if (getValue(row, "Status").trim().toLowerCase() !== "complete") continue;
  const campaign = parseCampaignDate(getValue(row, "Campaign"));
  campaigns.add(campaign.label);
  const oldScores = questionIds.map((id) => normalizeScore(getValue(row, `item:${id}`))).filter((v) => v !== null);
  const newScores = questionIds.map((id) => normalizeScore(getValue(row, `item:${id}`) || getValue(row, String(id)))).filter((v) => v !== null);
  if (oldScores.length) withScoresOld++;
  if (newScores.length) withScoresNew++;
}

console.log(JSON.stringify({ withScoresOld, withScoresNew, campaigns: [...campaigns] }, null, 2));
