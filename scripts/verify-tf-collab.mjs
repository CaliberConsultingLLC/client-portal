import { readFileSync } from "fs";

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') { q = !q; cur += ch; }
    else if (ch === "\n" && !q) { lines.push(cur.replace(/\r$/, "")); cur = ""; }
    else cur += ch;
  }
  if (cur.length) lines.push(cur.replace(/\r$/, ""));
  return lines.map((line) => {
    const f = [];
    let field = "";
    let qq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') qq = !qq;
      else if (c === "," && !qq) { f.push(field.trim()); field = ""; }
      else field += c;
    }
    f.push(field.trim());
    return f;
  });
}

const NORMALIZE = {
  Production: "Production Floor",
  "Production Control": "Production Control & Sourcing",
  Sourcing: "Production Control & Sourcing",
};
const norm = (v) => NORMALIZE[v] ?? v;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

const db = parseCSV(readFileSync(".tmp-tf/database.csv", "utf8"));
const stmt = parseCSV(readFileSync(".tmp-tf/statements.csv", "utf8"));

const headers = db[0];
const columnForItem = {};
headers.forEach((h, i) => { if (/^\d+$/.test(h)) columnForItem[parseInt(h, 10)] = i; });
const deptCol = headers.findIndex((h) => h.toLowerCase() === "department");

// statements → canonical grouping
const deptScoreItemIds = {};
const departments = [];
const ciByQuestion = {};
const rawCounter = {};
for (let i = 1; i < stmt.length; i++) {
  const [id, index, comment, text] = stmt[i];
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId)) continue;
  if (index === "Dept Score") {
    const c = norm(text);
    if (!departments.includes(c)) departments.push(c);
    (deptScoreItemIds[c] ??= []).push(itemId);
  } else if (comment !== "X") {
    const c = norm(index);
    const qi = rawCounter[index] ?? 0;
    rawCounter[index] = qi + 1;
    (ciByQuestion[c] ??= []);
    (ciByQuestion[c][qi] ??= []).push(itemId);
  }
}

const rows = db.slice(1).filter((r) => r.length > deptCol && r.some((c) => c.trim() !== ""));
const val = (row, itemId) => {
  const idx = columnForItem[itemId];
  if (idx === undefined) return null;
  const raw = row[idx];
  if (raw === undefined || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
};
const avgItems = (row, ids) => avg(ids.map((id) => val(row, id)).filter((v) => v !== null));

// Build respondent cdrs ratings per canonical dept
console.log("Canonical departments (", departments.length, "):", JSON.stringify(departments));
console.log("Distinct DB departments:", JSON.stringify([...new Set(rows.map((r) => norm(r[deptCol])))]));

console.log("\n=== CDRS (self-excluded, merged), 0-100 ===");
console.log("Dept".padEnd(28), "Incoming", " Outgoing", "  CI");
for (const dept of departments) {
  const incoming = [];
  const outgoing = [];
  const ci = [];
  for (const row of rows) {
    const src = norm(row[deptCol] || "");
    // incoming: this dept's pooled dept-score cols, from raters not in this dept
    if (src !== dept) {
      const r = avgItems(row, deptScoreItemIds[dept]);
      if (r !== null) incoming.push(r);
    }
    // outgoing: answers given BY this dept's employees to OTHER depts
    if (src === dept) {
      for (const other of departments) {
        if (other === dept) continue;
        const r = avgItems(row, deptScoreItemIds[other]);
        if (r !== null) outgoing.push(r);
      }
    }
    // CI: how OTHER depts rate this dept's CI questions
    if (src !== dept) {
      for (const ids of ciByQuestion[dept] ?? []) {
        const r = avgItems(row, ids);
        if (r !== null) ci.push(r);
      }
    }
  }
  const fmt = (v) => (v === null ? "  —  " : v.toFixed(1).padStart(6));
  console.log(
    dept.padEnd(28),
    fmt(avg(incoming)),
    " ",
    fmt(avg(outgoing)),
    " ",
    fmt(avg(ci)),
    `  (in=${incoming.length}, out=${outgoing.length}, ci=${ci.length})`
  );
}
