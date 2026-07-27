import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
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

const dbPath = "clients/dws/data/DWSDatabase.csv";
const stmtPath = "clients/dws/data/DWS 2024 Campaign Statements.csv";

// Mirror persistentCachePath(): sha1(cacheKey).slice(0,16), cacheKey = "dws::acquisition,integration"
const cacheKey = "dws::acquisition,integration";
const hash = createHash("sha1").update(cacheKey).digest("hex").slice(0, 16);
const cachePath = `clients/dws/cache/ee-dashboard-${hash}.json`;

async function meta(p) {
  try {
    const [m] = await bucket.file(p).getMetadata();
    return { exists: true, size: Number(m.size ?? 0), updated: m.updated };
  } catch {
    return { exists: false };
  }
}

const t0 = Date.now();
const [dbFile] = await bucket.file(dbPath).download();
const dbMs = Date.now() - t0;
const dbText = dbFile.toString("utf8");
const dbLines = dbText.trim().split(/\r?\n/);

const stmtMeta = await meta(stmtPath);
const cacheMeta = await meta(cachePath);

let cacheStats = null;
if (cacheMeta.exists) {
  const tc = Date.now();
  const [buf] = await bucket.file(cachePath).download();
  const dlMs = Date.now() - tc;
  const tp = Date.now();
  const parsed = JSON.parse(buf.toString("utf8"));
  const parseMs = Date.now() - tp;
  const data = parsed.data ?? {};
  cacheStats = {
    downloadMs: dlMs,
    parseMs,
    jsonBytes: buf.length,
    jsonMB: +(buf.length / 1024 / 1024).toFixed(2),
    respondents: Array.isArray(data.respondents) ? data.respondents.length : null,
    partnerRespondents: Array.isArray(data.partnerRespondents) ? data.partnerRespondents.length : null,
    questions: Array.isArray(data.questions) ? data.questions.length : null,
    campaigns: data.meta?.campaigns?.length ?? null,
    sampleRespondentKeys: data.respondents?.[0] ? Object.keys(data.respondents[0]) : null,
    scoresPerRespondent: data.respondents?.[0]?.scores ? Object.keys(data.respondents[0].scores).length : null,
  };
}

console.log(
  JSON.stringify(
    {
      database: { path: dbPath, downloadMs: dbMs, rows: Math.max(0, dbLines.length - 1), sizeMB: +(dbFile.length / 1024 / 1024).toFixed(2) },
      statements: stmtMeta,
      persistedCache: { path: cachePath, ...cacheMeta, sizeMB: cacheMeta.exists ? +(cacheMeta.size / 1024 / 1024).toFixed(2) : null },
      cacheStats,
    },
    null,
    2
  )
);
